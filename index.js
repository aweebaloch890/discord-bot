require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const fs = require("fs");
const http = require("http");

const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1397441836330651798";
const OPEN_CATEGORY_ID = "1337265672597672079";
const CLOSED_CATEGORY_ID = "1407037252609118328";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// ================= TICKET COUNTER =================
let ticketData = { count: 0 };
if (fs.existsSync("./tickets.json")) {
    ticketData = JSON.parse(fs.readFileSync("./tickets.json"));
}

// ================= VOUCH DATA =================
let vouchData = { users: {} };
if (fs.existsSync("./vouches.json")) {
    vouchData = JSON.parse(fs.readFileSync("./vouches.json"));
}

// ================= READY =================
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await client.application.commands.set([
        { name: "ticketpanel", description: "Send ticket panel" },
        {
            name: "vouch",
            description: "Give vouch to user",
            options: [
                { name: "user", type: 6, description: "Select user", required: true },
                { name: "message", type: 3, description: "Vouch message", required: true }
            ]
        },
        {
            name: "vouches",
            description: "Check user vouches",
            options: [
                { name: "user", type: 6, description: "Select user", required: true }
            ]
        }
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

    // ===== SLASH COMMANDS =====
    if (interaction.isChatInputCommand()) {

        // ===== TICKET PANEL =====
        if (interaction.commandName === "ticketpanel") {

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle("TEC TRADER")
                .setDescription(
`If you need help, click on the option corresponding to the type of ticket you want to open.

**Ticket times**
• 24/7`
                );

            const select = new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("Select ticket type")
                .addOptions([
                    { label: "Purchase", value: "purchase", emoji: "🛒" },
                    { label: "Replacement", value: "replace", emoji: "🔁" },
                    { label: "Product not received", value: "notreceived", emoji: "🚫" },
                    { label: "Other", value: "other", emoji: "🌐" }
                ]);

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // ===== VOUCH ADD =====
        if (interaction.commandName === "vouch") {

            const user = interaction.options.getUser("user");
            const message = interaction.options.getString("message");

            if (user.id === interaction.user.id)
                return interaction.reply({ content: "You cannot vouch yourself ❌", ephemeral: true });

            if (!vouchData.users[user.id]) {
                vouchData.users[user.id] = [];
            }

            vouchData.users[user.id].push({
                from: interaction.user.tag,
                message: message,
                date: new Date().toLocaleDateString()
            });

            fs.writeFileSync("./vouches.json", JSON.stringify(vouchData, null, 2));

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("✅ New Vouch Added")
                        .addFields(
                            { name: "User", value: `<@${user.id}>` },
                            { name: "From", value: interaction.user.tag },
                            { name: "Message", value: message }
                        )
                        .setFooter({ text: `Total Vouches: ${vouchData.users[user.id].length}` })
                        .setColor(0x00ff00)
                ]
            });
        }

        // ===== VOUCH CHECK =====
        if (interaction.commandName === "vouches") {

            const user = interaction.options.getUser("user");

            if (!vouchData.users[user.id] || vouchData.users[user.id].length === 0) {
                return interaction.reply("No vouches found.");
            }

            const list = vouchData.users[user.id]
                .map(v => `• ${v.message} (by ${v.from})`)
                .slice(-10)
                .join("\n");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`⭐ ${user.username}'s Vouches`)
                        .setDescription(list)
                        .setFooter({ text: `Total: ${vouchData.users[user.id].length}` })
                        .setColor(0xffd700)
                ]
            });
        }
    }

    // ===== DROPDOWN =====
    if (interaction.isStringSelectMenu()) {

        const type = interaction.values[0];
        let modal = new ModalBuilder()
            .setCustomId(`modal_${type}`)
            .setTitle("Ticket Form");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("details")
                    .setLabel("Provide required details")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            )
        );

        return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {

        ticketData.count++;
        fs.writeFileSync("./tickets.json", JSON.stringify(ticketData));

        const ticketNumber = String(ticketData.count).padStart(2, "0");
        const channelName = `ticket-${ticketNumber}`;

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: OPEN_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("🔒 Close Ticket")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
            content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Ticket #${ticketNumber}`)
                    .setDescription(interaction.fields.getTextInputValue("details"))
                    .setColor(0x00ff99)
            ],
            components: [closeBtn]
        });

        return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // ===== CLOSE BUTTON =====
    if (interaction.isButton()) {
        if (interaction.customId === "close_ticket") {

            const channel = interaction.channel;

            await interaction.reply("Closing ticket...");

            const messages = await channel.messages.fetch({ limit: 100 });
            const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            let transcript = `Transcript of ${channel.name}\n\n`;
            sorted.forEach(msg => {
                transcript += `[${msg.author.tag}] ${msg.content}\n`;
            });

            const fileName = `${channel.name}-transcript.txt`;
            fs.writeFileSync(fileName, transcript);

            try {
                await interaction.user.send({
                    content: "Here is your ticket transcript:",
                    files: [fileName]
                });
            } catch {}

            fs.unlinkSync(fileName);

            await channel.setParent(CLOSED_CATEGORY_ID);
            await channel.setName(`closed-${channel.name}`);
            await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false });
        }
    }
});

// ================= ANTI LINK + SPAM =================
const spamMap = new Map();

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    if (message.content.match(/https?:\/\/\S+/) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await message.delete().catch(()=>{});
    }

    if (!spamMap.has(message.author.id)) {
        spamMap.set(message.author.id, { count: 1 });
        setTimeout(() => spamMap.delete(message.author.id), 5000);
    } else {
        const data = spamMap.get(message.author.id);
        data.count++;
        if (data.count >= 6) {
            await message.member.timeout(5 * 60000).catch(()=>{});
            spamMap.delete(message.author.id);
        }
    }
});

// ================= KEEP ALIVE =================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
