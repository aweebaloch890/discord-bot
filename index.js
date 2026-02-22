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

// ================= CONFIG =================
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1397441836330651798";
const OPEN_CATEGORY_ID = "1337265672597672079";
const CLOSED_CATEGORY_ID = "1407037252609118328";

// ================= CLIENT =================
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

// ================= DATA =================
let ticketData = fs.existsSync("./tickets.json")
    ? JSON.parse(fs.readFileSync("./tickets.json"))
    : { count: 0 };

let vouchData = fs.existsSync("./vouches.json")
    ? JSON.parse(fs.readFileSync("./vouches.json"))
    : { users: {} };

// ================= READY =================
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await client.application.commands.set([
        { name: "ticketpanel", description: "Send ticket panel" },

        { name: "vouch", description: "Give vouch",
          options: [
              { name: "user", type: 6, required: true, description: "User" },
              { name: "message", type: 3, required: true, description: "Message" }
          ]},

        { name: "vouches", description: "Check vouches",
          options: [{ name: "user", type: 6, required: true }]},

        { name: "mute", description: "Mute user",
          options: [{ name: "user", type: 6, required: true }]},

        { name: "timeout", description: "Timeout user",
          options: [{ name: "user", type: 6, required: true }]},

        { name: "kick", description: "Kick user",
          options: [{ name: "user", type: 6, required: true }]},

        { name: "ban", description: "Ban user",
          options: [{ name: "user", type: 6, required: true }]}
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

    // ===== SLASH COMMANDS =====
    if (interaction.isChatInputCommand()) {

        // ===== PANEL =====
        if (interaction.commandName === "ticketpanel") {
            if (interaction.channelId !== PANEL_CHANNEL_ID)
                return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("TEC TRADER")
                .setColor(0x2b2d31)
                .setDescription("Select ticket type below");

            const select = new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("Select ticket type")
                .addOptions(
                    { label: "Purchase", value: "purchase", emoji: "🛒" },
                    { label: "Replacement", value: "replace", emoji: "🔁" },
                    { label: "Product not received", value: "notreceived", emoji: "🚫" },
                    { label: "Other", value: "other", emoji: "🌐" }
                );

            return interaction.reply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(select)]
            });
        }

        // ===== MODERATION =====
        const member = interaction.options.getMember("user");

        if (interaction.commandName === "mute" || interaction.commandName === "timeout") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return interaction.reply({ content: "No permission ❌", ephemeral: true });

            await member.timeout(5 * 60 * 1000);
            return interaction.reply(`🔇 ${member.user.tag} muted`);
        }

        if (interaction.commandName === "kick") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return interaction.reply({ content: "No permission ❌", ephemeral: true });

            await member.kick();
            return interaction.reply(`👢 ${member.user.tag} kicked`);
        }

        if (interaction.commandName === "ban") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return interaction.reply({ content: "No permission ❌", ephemeral: true });

            await member.ban();
            return interaction.reply(`⛔ ${member.user.tag} banned`);
        }

        // ===== VOUCH =====
        if (interaction.commandName === "vouch") {
            const user = interaction.options.getUser("user");
            const msg = interaction.options.getString("message");

            if (!vouchData.users[user.id]) vouchData.users[user.id] = [];
            vouchData.users[user.id].push({
                from: interaction.user.tag,
                msg,
                date: new Date().toLocaleString()
            });

            fs.writeFileSync("./vouches.json", JSON.stringify(vouchData, null, 2));
            return interaction.reply(`✅ Vouch added for ${user.tag}`);
        }

        if (interaction.commandName === "vouches") {
            const user = interaction.options.getUser("user");
            const list = vouchData.users[user.id] || [];

            if (!list.length) return interaction.reply("No vouches.");

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`${user.username} Vouches`)
                    .setDescription(list.map(v => `• ${v.msg} — ${v.from}`).join("\n"))
                ]
            });
        }
    }

    // ===== DROPDOWN =====
    if (interaction.isStringSelectMenu()) {
        const modal = new ModalBuilder()
            .setCustomId(`modal_${interaction.values[0]}`)
            .setTitle("Ticket Form")
            .addComponents(
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

        const number = String(ticketData.count).padStart(2, "0");
        const channel = await interaction.guild.channels.create({
            name: `ticket-${number}`,
            type: ChannelType.GuildText,
            parent: OPEN_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("close").setLabel("🔒 Close").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("claim").setLabel("👮 Claim").setStyle(ButtonStyle.Primary)
        );

        await channel.send({
            content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
            embeds: [new EmbedBuilder()
                .setTitle(`Ticket #${number}`)
                .setDescription(interaction.fields.getTextInputValue("details"))
            ],
            components: [buttons]
        });

        return interaction.reply({ content: `Ticket created ${channel}`, ephemeral: true });
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {
        const channel = interaction.channel;

        if (interaction.customId === "claim") {
            await channel.send(`👮 Claimed by ${interaction.user}`);
            return interaction.reply({ content: "Claimed", ephemeral: true });
        }

        if (interaction.customId === "close") {
            const msgs = await channel.messages.fetch({ limit: 100 });
            let transcript = msgs.map(m => `[${m.author.tag}] ${m.content}`).join("\n");

            fs.writeFileSync("transcript.txt", transcript);
            await interaction.user.send({ files: ["transcript.txt"] }).catch(()=>{});
            fs.unlinkSync("transcript.txt");

            await channel.setParent(CLOSED_CATEGORY_ID);
            await channel.setName(`closed-${channel.name}`);

            if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await channel.send(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("reopen").setLabel("🔓 Reopen").setStyle(ButtonStyle.Success)
                    )
                );
            }
            return interaction.reply("Ticket closed");
        }

        if (interaction.customId === "reopen") {
            await channel.setParent(OPEN_CATEGORY_ID);
            await channel.setName(channel.name.replace("closed-", ""));
            return interaction.reply("Ticket reopened");
        }
    }
});

// ================= ANTI LINK + SPAM =================
const spam = new Map();
client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    if (/https?:\/\//.test(msg.content)) {
        if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await msg.delete().catch(()=>{});
        }
    }

    if (!spam.has(msg.author.id)) {
        spam.set(msg.author.id, 1);
        setTimeout(() => spam.delete(msg.author.id), 5000);
    } else {
        spam.set(msg.author.id, spam.get(msg.author.id) + 1);
        if (spam.get(msg.author.id) >= 6) {
            await msg.member.timeout(5 * 60000).catch(()=>{});
            spam.delete(msg.author.id);
        }
    }
});

// ================= KEEP ALIVE =================
http.createServer((req, res) => {
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
