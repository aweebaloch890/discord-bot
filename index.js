require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

// ================= ERROR HANDLING =================
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
    return parseInt(`0x${require('color-convert').hsl.hex([hue, 100, 50])}`);
}

// ================= READY =================
client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [

        // ===== VOUCH =====
        {
            name: 'vouch',
            description: 'Give premium RGB vouch',
            options: [
                {
                    name: 'seller',
                    description: 'Select seller',
                    type: 6,
                    required: true
                },
                {
                    name: 'product',
                    description: 'Product name',
                    type: 3,
                    required: true
                },
                {
                    name: 'price',
                    description: 'Product price',
                    type: 3,
                    required: true
                },
                {
                    name: 'rating',
                    description: 'Rating from 1 to 5',
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
                {
                    name: 'reason',
                    description: 'Reason for vouch',
                    type: 3,
                    required: false
                }
            ]
        },

        // ===== MESSAGE =====
        {
            name: 'message',
            description: 'Send embed message to channel',
            options: [
                {
                    name: 'channel',
                    description: 'Select channel',
                    type: 7,
                    required: true
                },
                {
                    name: 'text',
                    description: 'Message content',
                    type: 3,
                    required: true
                }
            ]
        },

        // ===== KICK =====
        {
            name: 'kick',
            description: 'Kick a user',
            options: [
                {
                    name: 'user',
                    description: 'Select user to kick',
                    type: 6,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for kick',
                    type: 3,
                    required: false
                }
            ]
        },

        // ===== TIMEOUT =====
        {
            name: 'timeout',
            description: 'Timeout a user',
            options: [
                {
                    name: 'user',
                    description: 'Select user to timeout',
                    type: 6,
                    required: true
                },
                {
                    name: 'duration',
                    description: 'Duration in minutes',
                    type: 4,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for timeout',
                    type: 3,
                    required: false
                }
            ]
        }
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
            const reason = interaction.options.getString('reason') || "No reason";

            await member.kick(reason);
            return interaction.reply(`👢 ${member.user.tag} kicked`);
        }

        // ===== TIMEOUT =====
        if (interaction.commandName === 'timeout') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember('user');
            const duration = interaction.options.getInteger('duration');
            const reason = interaction.options.getString('reason') || "No reason";

            await member.timeout(duration * 60 * 1000, reason);
            return interaction.reply(`⏳ ${member.user.tag} timeout ${duration} min`);
        }

    } catch (err) {
        console.error("Interaction Error:", err);
    }
});

// ================= ANTI LINK + ANTI SPAM =================
const spamMap = new Map();

client.on('messageCreate', async message => {
    if (message.author.bot) return;

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
});

// ================= RAILWAY KEEP ALIVE =================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Running ✅");
}).listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(process.env.TOKEN);
