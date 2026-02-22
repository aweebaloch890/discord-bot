require('dotenv').config();
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
} = require('discord.js');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const colorConvert = require('color-convert');
const http = require('http');

// ===== YOUR IDS =====
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1397441836330651798";
const TICKET_CATEGORY_ID = "1337265672597672079";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

let vouches = [];
if (fs.existsSync('./vouches.json')) {
    vouches = JSON.parse(fs.readFileSync('./vouches.json'));
}

let hue = 0;
function getRGB() {
    hue = (hue + 30) % 360;
    return parseInt(`0x${colorConvert.hsl.hex([hue, 100, 50])}`);
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        { name: 'ticketpanel', description: 'Send ticket panel' }
    ];

    await client.application.commands.set(commands, process.env.GUILD_ID);
    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

    // ===== SLASH =====
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "ticketpanel") {

            const embed = new EmbedBuilder()
                .setTitle("Elite Services | Tickets")
                .setDescription("Select ticket type below.")
                .setColor(0x5865F2);

            const select = new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("Choose ticket type")
                .addOptions([
                    { label: "Purchase", value: "purchase" },
                    { label: "Replacement", value: "replace" },
                    { label: "Not Received", value: "notreceive" }
                ]);

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // ===== DROPDOWN =====
    if (interaction.isStringSelectMenu()) {

        const type = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`modal_${type}`)
            .setTitle("Ticket Form");

        const input1 = new TextInputBuilder()
            .setCustomId("field1")
            .setLabel("Product / Issue")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const input2 = new TextInputBuilder()
            .setCustomId("field2")
            .setLabel("Payment Method / Order ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const input3 = new TextInputBuilder()
            .setCustomId("field3")
            .setLabel("Extra Details")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input1),
            new ActionRowBuilder().addComponents(input2),
            new ActionRowBuilder().addComponents(input3)
        );

        return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {

        const existing = interaction.guild.channels.cache.find(
            c => c.name === `ticket-${interaction.user.id}`
        );

        if (existing)
            return interaction.reply({ content: "You already have ticket open ❌", ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("🔒 Close Ticket")
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setTitle("Ticket Opened")
            .setColor(0x00ff99)
            .addFields(
                { name: "User", value: `<@${interaction.user.id}>` },
                { name: "Details", value: interaction.fields.getTextInputValue("field1") },
                { name: "Payment / ID", value: interaction.fields.getTextInputValue("field2") },
                { name: "Extra", value: interaction.fields.getTextInputValue("field3") }
            );

        await channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            components: [closeRow]
        });

        return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // ===== CLOSE =====
    if (interaction.isButton()) {
        if (interaction.customId === "close_ticket") {

            if (
                interaction.member.roles.cache.has(STAFF_ROLE_ID) ||
                interaction.channel.name.includes(interaction.user.id)
            ) {
                await interaction.reply("Closing...");
                setTimeout(() => interaction.channel.delete().catch(()=>{}), 2000);
            } else {
                interaction.reply({ content: "No permission ❌", ephemeral: true });
            }
        }
    }
});

// ===== ANTI LINK + SPAM =====
const spamMap = new Map();

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    if (message.content.match(/https?:\/\/\S+/) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await message.delete().catch(()=>{});
        message.channel.send("Links not allowed ❌");
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

// ===== KEEP ALIVE =====
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
