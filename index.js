require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1397441836330651798";
const OPEN_CATEGORY_ID = "1337265672597672079";

const SPAM_LIMIT = 5; // messages
const SPAM_TIME = 5000; // 5 sec
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 min

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

// ================= DATA =================
let ticketData = fs.existsSync("./tickets.json")
    ? JSON.parse(fs.readFileSync("./tickets.json"))
    : { count: 0 };

const spamMap = new Map();

// ================= READY =================
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await client.application.commands.set([
        { name: "ticketpanel", description: "Send ticket panel" },

        {
            name: "vouch",
            description: "Give vouch",
            options: [
                { name: "user", description: "Select user", type: 6, required: true },
                { name: "product", description: "Product Name", type: 3, required: true },
                { name: "price", description: "Price", type: 3, required: true },
                { name: "rating", description: "Rating 1-5", type: 4, required: true },
                { name: "reason", description: "Reason", type: 3, required: true }
            ]
        },

        {
            name: "kick",
            description: "Kick member",
            options: [
                { name: "user", type: 6, description: "User", required: true },
                { name: "reason", type: 3, description: "Reason", required: true }
            ]
        },

        {
            name: "ban",
            description: "Ban member",
            options: [
                { name: "user", type: 6, description: "User", required: true },
                { name: "reason", type: 3, description: "Reason", required: true }
            ]
        },

        {
            name: "timeout",
            description: "Timeout member",
            options: [
                { name: "user", type: 6, description: "User", required: true },
                { name: "minutes", type: 4, description: "Minutes", required: true },
                { name: "reason", type: 3, description: "Reason", required: true }
            ]
        }
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= ANTI LINK + SPAM =================
client.on("messageCreate", async message => {

    if (!message.guild || message.author.bot) return;

    const member = message.member;

    if (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)) return;

    // ===== ANTI LINK =====
    const linkRegex = /(https?:\/\/|discord\.gg|www\.)/i;

    if (linkRegex.test(message.content)) {
        await message.delete().catch(() => {});
        await member.timeout(TIMEOUT_DURATION, "Posting links").catch(() => {});
        return message.channel.send(`🚫 ${message.author}, links not allowed!`).then(m => {
            setTimeout(() => m.delete().catch(()=>{}), 3000);
        });
    }

    // ===== ANTI SPAM =====
    const now = Date.now();
    const timestamps = spamMap.get(message.author.id) || [];

    timestamps.push(now);
    spamMap.set(message.author.id, timestamps.filter(ts => now - ts < SPAM_TIME));

    if (spamMap.get(message.author.id).length >= SPAM_LIMIT) {

        spamMap.delete(message.author.id);

        await member.timeout(TIMEOUT_DURATION, "Spam detected").catch(() => {});
        return message.channel.send(`🚫 ${message.author}, stop spamming!`).then(m => {
            setTimeout(() => m.delete().catch(()=>{}), 3000);
        });
    }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const member = interaction.member;

    if (["kick", "ban", "timeout"].includes(interaction.commandName)) {

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
            return interaction.reply({ content: "❌ Admin Only", ephemeral: true });

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!target) return interaction.reply({ content: "User not found", ephemeral: true });

        try {

            if (interaction.commandName === "kick") {
                await target.kick(reason);
                return interaction.reply(`👢 ${user.tag} kicked\nReason: ${reason}`);
            }

            if (interaction.commandName === "ban") {
                await target.ban({ reason });
                return interaction.reply(`🔨 ${user.tag} banned\nReason: ${reason}`);
            }

            if (interaction.commandName === "timeout") {
                const minutes = interaction.options.getInteger("minutes");
                await target.timeout(minutes * 60 * 1000, reason);
                return interaction.reply(`⏳ ${user.tag} timeout ${minutes}m\nReason: ${reason}`);
            }

        } catch {
            return interaction.reply({ content: "❌ Missing bot permission", ephemeral: true });
        }
    }

    if (interaction.commandName === "vouch") {

        const user = interaction.options.getUser("user");
        const product = interaction.options.getString("product");
        const price = interaction.options.getString("price");
        const rating = interaction.options.getInteger("rating");
        const reason = interaction.options.getString("reason");

        const stars = "⭐".repeat(Math.min(rating, 5));

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle("📝 New Vouch")
            .addFields(
                { name: "Product", value: product },
                { name: "Price", value: price },
                { name: "Seller", value: `<@${user.id}>` },
                { name: "Rating", value: `${stars} (${rating}/5)` },
                { name: "Reason", value: reason }
            );

        return interaction.reply({ embeds: [embed] });
    }
});

// ================= KEEP ALIVE =================
http.createServer((req, res) => {
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
