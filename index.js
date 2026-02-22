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
const http = require('http');

// ================= ERROR HANDLING (PREVENT CRASH) =================
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ================= DATABASE =================
let vouches = [];
if (fs.existsSync('./vouches.json')) {
    vouches = JSON.parse(fs.readFileSync('./vouches.json'));
}

// ================= RGB SYSTEM =================
let hue = 0;
function getRGB() {
    hue = (hue + 25) % 360;
    return `hsl(${hue}, 100%, 50%)`;
}

// ================= READY =================
client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        {
            name: 'vouch',
            description: 'Give premium RGB vouch',
            options: [
                { name: 'seller', type: 6, required: true, description: 'Select seller' },
                { name: 'product', type: 3, required: true, description: 'Product name' },
                { name: 'price', type: 3, required: true, description: 'Price' },
                {
                    name: 'rating',
                    type: 4,
                    required: true,
                    description: 'Rating 1-5',
                    choices: [
                        { name: '1 Star', value: 1 },
                        { name: '2 Stars', value: 2 },
                        { name: '3 Stars', value: 3 },
                        { name: '4 Stars', value: 4 },
                        { name: '5 Stars', value: 5 }
                    ]
                },
                { name: 'reason', type: 3, required: false, description: 'Reason' }
            ]
        },
        {
            name: 'message',
            description: 'Send embed message',
            options: [
                { name: 'channel', type: 7, required: true },
                { name: 'text', type: 3, required: true }
            ]
        },
        { name: 'kick', description: 'Kick user', options: [{ name: 'user', type: 6, required: true }] },
        { name: 'timeout', description: 'Timeout user', options: [{ name: 'user', type: 6, required: true }] }
    ];

    try {
        await client.application.commands.set(commands, process.env.GUILD_ID);
        console.log("Slash Commands Registered ✅");
    } catch (err) {
        console.error("Command Register Error:", err);
    }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    try {

        // ===== VOUCH =====
        if (interaction.commandName === 'vouch') {

            const seller = interaction.options.getUser('seller');
            const product = interaction.options.getString('product');
            const price = interaction.options.getString('price');
            const rating = interaction.options.getInteger('rating');
            const reason = interaction.options.getString('reason') || "No reason provided.";

            if (seller.id === interaction.user.id)
                return interaction.reply({ content: "❌ Khud ko vouch nahi de sakte!", ephemeral: true });

            const stars = "⭐".repeat(rating);
            const vouchID = uuidv4().split("-")[0].toUpperCase();

            const embed = new EmbedBuilder()
                .setColor(getRGB())
                .setTitle("💎 New Vouch Recorded")
                .addFields(
                    { name: "🛒 Product", value: product, inline: true },
                    { name: "💲 Price", value: price, inline: true },
                    { name: "👤 Seller", value: `<@${seller.id}>` },
                    { name: "⭐ Rating", value: `${stars} (${rating}/5)` },
                    { name: "📝 Reason", value: reason },
                    { name: "🙌 Vouched By", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "🆔 ID", value: vouchID, inline: true }
                )
                .setTimestamp();

            vouches.push({
                id: vouchID,
                seller: seller.id,
                product,
                price,
                rating,
                reason,
                vouchedBy: interaction.user.id,
                date: new Date()
            });

            fs.writeFileSync('./vouches.json', JSON.stringify(vouches, null, 2));

            return interaction.reply({ embeds: [embed] });
        }

        // ===== MESSAGE =====
        if (interaction.commandName === 'message') {
            const channel = interaction.options.getChannel('channel');
            const text = interaction.options.getString('text');

            const embed = new EmbedBuilder()
                .setColor(getRGB())
                .setDescription(text)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            return interaction.reply({ content: "Message sent ✅", ephemeral: true });
        }

        // ===== KICK =====
        if (interaction.commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember('user');
            await member.kick();
            return interaction.reply(`👢 ${member.user.tag} kicked`);
        }

        // ===== TIMEOUT =====
        if (interaction.commandName === 'timeout') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember('user');
            await member.timeout(10 * 60 * 1000);
            return interaction.reply(`⏳ ${member.user.tag} timeout 10 min`);
        }

    } catch (err) {
        console.error("Interaction Error:", err);
    }
});

// ================= ANTI LINK + ANTI SPAM =================
const spamMap = new Map();

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    try {

        if (message.content.match(/https?:\/\/\S+/) &&
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            return message.channel.send(`${message.author} ❌ Links allowed nahi.`);
        }

        if (!spamMap.has(message.author.id)) {
            spamMap.set(message.author.id, { count: 1 });
            setTimeout(() => spamMap.delete(message.author.id), 5000);
        } else {
            const data = spamMap.get(message.author.id);
            data.count++;
            if (data.count >= 6) {
                await message.member.timeout(5 * 60 * 1000).catch(() => {});
                message.channel.send(`${message.author} spam kar raha tha. Timeout.`);
                spamMap.delete(message.author.id);
            }
        }

    } catch (err) {
        console.error("Message Error:", err);
    }
});

// ================= RAILWAY KEEP ALIVE =================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Running ✅");
}).listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(process.env.TOKEN);
