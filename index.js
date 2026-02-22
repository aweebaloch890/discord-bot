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

const SPAM_LIMIT = 6;
const SPAM_TIME = 5000;
const AUTO_TIMEOUT = 5 * 60 * 1000;

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

// ================= READY =================
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await client.application.commands.set([
        { name: "ticketpanel", description: "Send ticket panel" },

        {
            name: "vouch",
            description: "Create vouch",
            options: [
                { name: "user", type: 6, description: "Seller", required: true },
                { name: "product", type: 3, description: "Product Name", required: true },
                { name: "price", type: 3, description: "Price", required: true },
                { name: "rating", type: 4, description: "Rating 1-5", required: true },
                { name: "reason", type: 3, description: "Reason", required: true }
            ]
        },

        { name: "kick", description: "Kick user", options: [{ name: "user", type: 6, required: true }] },
        { name: "ban", description: "Ban user", options: [{ name: "user", type: 6, required: true }] },
        { name: "unban", description: "Unban user", options: [{ name: "userid", type: 3, required: true }] },
        { name: "timeout", description: "Timeout user", options: [{ name: "user", type: 6, required: true }] }
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
try {

// ===== SLASH COMMANDS =====
if (interaction.isChatInputCommand()) {

if (interaction.commandName === "ticketpanel") {

if (interaction.channelId !== PANEL_CHANNEL_ID)
return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

const embed = new EmbedBuilder()
.setTitle("TEC TRADER")
.setColor(0x2b2d31)
.setDescription("Select Ticket Type Below");

const select = new StringSelectMenuBuilder()
.setCustomId("ticket_select")
.setPlaceholder("Select ticket type")
.addOptions(
{ label: "🛒 Purchase", value: "purchase" },
{ label: "🔁 Replacement", value: "replacement" },
{ label: "❌ Not Received", value: "notreceived" },
{ label: "🌐 Other", value: "other" }
);

return interaction.reply({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(select)]
});
}

// ===== VOUCH SYSTEM =====
if (interaction.commandName === "vouch") {

const user = interaction.options.getUser("user");
const product = interaction.options.getString("product");
const price = interaction.options.getString("price");
let rating = interaction.options.getInteger("rating");
const reason = interaction.options.getString("reason");

if (rating > 5) rating = 5;
if (rating < 1) rating = 1;

const stars = "⭐".repeat(rating);
const vouchID = Math.random().toString(36).substring(2,8).toUpperCase();

const embed = new EmbedBuilder()
.setColor(0x2b2d31)
.setTitle("🛍️ • New Vouch Recorded!")
.addFields(
{ name: "🛒 Product", value: product, inline: true },
{ name: "💲 Price", value: price, inline: true },
{ name: "👤 Seller", value: `<@${user.id}>`, inline: false },
{ name: "⭐ Rating", value: `${stars} (${rating}/5)`, inline: false },
{ name: "📝 Reason", value: reason },
{ name: "🔖 Vouched By", value: `<@${interaction.user.id}>`, inline: true },
{ name: "🆔 Vouch ID", value: vouchID, inline: true }
);

return interaction.reply({ embeds: [embed] });
}

// ===== MODERATION =====
if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
return interaction.reply({ content: "Admin Only ❌", ephemeral: true });

const member = interaction.options.getMember("user");

if (interaction.commandName === "kick") {
await member.kick().catch(()=>{});
return interaction.reply("User Kicked ✅");
}

if (interaction.commandName === "ban") {
await member.ban().catch(()=>{});
return interaction.reply("User Banned ✅");
}

if (interaction.commandName === "timeout") {
await member.timeout(AUTO_TIMEOUT).catch(()=>{});
return interaction.reply("User Timed Out ✅");
}

if (interaction.commandName === "unban") {
const id = interaction.options.getString("userid");
await interaction.guild.members.unban(id).catch(()=>{});
return interaction.reply("User Unbanned ✅");
}
}

// ===== TICKET CLOSE FIX =====
if (interaction.isButton()) {

if (interaction.customId === "close") {

await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
ViewChannel: false
}).catch(()=>{});

await interaction.channel.setParent(CLOSED_CATEGORY_ID);
await interaction.channel.setName(`closed-${interaction.channel.name}`);

return interaction.reply({ content: "Ticket Closed ✅", ephemeral: true });
}
}

} catch (err) {
console.log(err);
if (!interaction.replied)
interaction.reply({ content: "Error handled safely ✅", ephemeral: true }).catch(()=>{});
}
});

// ================= ANTI LINK + SPAM =================
const spam = new Map();
client.on("messageCreate", async msg => {

if (!msg.guild || msg.author.bot) return;
if (msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

if (/https?:\/\/|discord\.gg/i.test(msg.content)) {
await msg.delete().catch(()=>{});
await msg.member.timeout(AUTO_TIMEOUT).catch(()=>{});
}

const now = Date.now();
const data = spam.get(msg.author.id) || [];
data.push(now);
spam.set(msg.author.id, data.filter(t => now - t < SPAM_TIME));

if (spam.get(msg.author.id).length >= SPAM_LIMIT) {
await msg.member.timeout(AUTO_TIMEOUT).catch(()=>{});
spam.delete(msg.author.id);
}
});

// ================= KEEP ALIVE =================
http.createServer((req,res)=>{res.end("Running");}).listen(process.env.PORT||3000);

client.login(process.env.TOKEN);
