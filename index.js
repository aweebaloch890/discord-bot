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
    ChannelType
} = require('discord.js');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const colorConvert = require('color-convert');
const http = require('http');

// ===== YOUR IDS =====
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1397441836330651798";
const TICKET_CATEGORY_ID = "1337265672597672079";

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ===== DATABASE =====
let vouches = [];
if (fs.existsSync('./vouches.json')) {
    vouches = JSON.parse(fs.readFileSync('./vouches.json'));
}

// ===== RGB SYSTEM =====
let hue = 0;
function getRGB() {
    hue = (hue + 30) % 360;
    return parseInt(`0x${colorConvert.hsl.hex([hue, 100, 50])}`);
}

// ================= READY =================
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [

        { name: 'ticketpanel', description: 'Send ticket panel' },

        {
            name: 'vouch',
            description: 'Give vouch to seller',
            options: [
                { name: 'seller', description: 'Select seller', type: 6, required: true },
                { name: 'product', description: 'Product name', type: 3, required: true },
                { name: 'price', description: 'Price', type: 3, required: true },
                {
                    name: 'rating',
                    description: 'Rating 1-5',
                    type: 4,
                    required: true,
                    choices: [
                        { name: '1 Star', value: 1 },
                        { name: '2 Stars', value: 2 },
                        { name: '3 Stars', value: 3 },
                        { name: '4 Stars', value: 4 },
                        { name: '5 Stars', value: 5 }
                    ]
                },
                { name: 'reason', description: 'Reason', type: 3, required: false }
            ]
        },

        {
            name: 'kick',
            description: 'Kick user',
            options: [{ name: 'user', description: 'User', type: 6, required: true }]
        },

        {
            name: 'ban',
            description: 'Ban user',
            options: [{ name: 'user', description: 'User', type: 6, required: true }]
        },

        {
            name: 'timeout',
            description: 'Timeout user',
            options: [
                { name: 'user', description: 'User', type: 6, required: true },
                { name: 'duration', description: 'Minutes', type: 4, required: true }
            ]
        },

        {
            name: 'mute',
            description: 'Mute user 10 min',
            options: [{ name: 'user', description: 'User', type: 6, required: true }]
        }

    ];

    await client.application.commands.set(commands, process.env.GUILD_ID);
    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

    // ===== SLASH =====
    if (interaction.isChatInputCommand()) {

        // ===== VOUCH =====
        if (interaction.commandName === "vouch") {

            const seller = interaction.options.getUser("seller");
            const product = interaction.options.getString("product");
            const price = interaction.options.getString("price");
            const rating = interaction.options.getInteger("rating");
            const reason = interaction.options.getString("reason") || "No reason provided.";

            if (seller.id === interaction.user.id)
                return interaction.reply({ content: "You cannot vouch yourself ❌", ephemeral: true });

            const stars = "⭐".repeat(rating);
            const id = uuidv4().split("-")[0].toUpperCase();

            const embed = new EmbedBuilder()
                .setColor(getRGB())
                .setTitle("💎 New Vouch")
                .addFields(
                    { name: "Seller", value: `<@${seller.id}>`, inline: true },
                    { name: "Product", value: product, inline: true },
                    { name: "Price", value: price, inline: true },
                    { name: "Rating", value: `${stars} (${rating}/5)` },
                    { name: "Reason", value: reason },
                    { name: "Vouched By", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "ID", value: id, inline: true }
                )
                .setTimestamp();

            vouches.push({ id, seller: seller.id, product, price, rating, reason });
            fs.writeFileSync('./vouches.json', JSON.stringify(vouches, null, 2));

            return interaction.reply({ embeds: [embed] });
        }

        // ===== TICKET PANEL =====
        if (interaction.commandName === "ticketpanel") {

            if (interaction.channel.id !== PANEL_CHANNEL_ID)
                return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("Tec Trader | TICKETS")
                .setDescription("Click a button below to open ticket.")
                .setColor(0x5865F2);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("Support").setLabel("Support").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("Account").setLabel("Account").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("Nitro").setLabel("Nitro").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("Entertainment").setLabel("Entertainment").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("Boost").setLabel("Server Boost").setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {

        if (["Support","Account","nitro","Entertainment","Boost"].includes(interaction.customId)) {

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
                    .setLabel("Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [new EmbedBuilder().setTitle("Ticket Opened").setColor(0x00ff99)],
                components: [closeRow]
            });

            return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
        }

        if (interaction.customId === "close_ticket") {
            await interaction.reply("Closing...");
            setTimeout(() => interaction.channel.delete().catch(()=>{}), 2000);
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
