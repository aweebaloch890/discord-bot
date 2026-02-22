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
            name: "kick",
            description: "Kick user",
            options: [{ name: "user", type: 6, description: "User", required: true }]
        },
        {
            name: "ban",
            description: "Ban user",
            options: [{ name: "user", type: 6, description: "User", required: true }]
        },
        {
            name: "unban",
            description: "Unban user",
            options: [{ name: "userid", type: 3, description: "User ID", required: true }]
        },
        {
            name: "timeout",
            description: "Timeout user",
            options: [{ name: "user", type: 6, description: "User", required: true }]
        }
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
try {

// ================= PANEL =================
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

// ================= MODERATION =================
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

// ================= DROPDOWN =================
if (interaction.isStringSelectMenu()) {

let modal;

if (interaction.values[0] === "purchase") {
modal = new ModalBuilder()
.setCustomId("purchase")
.setTitle("🛒 Purchase")
.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("payment").setLabel("Payment Method JazzCash/Easypaisa/Bank/Crypto").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("details").setLabel("Extra Details").setStyle(TextInputStyle.Paragraph).setRequired(true))
);
}

if (interaction.values[0] === "replacement") {
modal = new ModalBuilder()
.setCustomId("replacement")
.setTitle("🔁 Replacement")
.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("order").setLabel("Order ID").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("transaction").setLabel("Transaction ID").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("problem").setLabel("Problem Description").setStyle(TextInputStyle.Paragraph).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("screenshot").setLabel("Screenshot").setStyle(TextInputStyle.Short).setRequired(true))
);
}

if (interaction.values[0] === "notreceived") {
modal = new ModalBuilder()
.setCustomId("notreceived")
.setTitle("❌ Not Received")
.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("transaction").setLabel("Transaction ID").setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("proof").setLabel("Proof Screenshot").setStyle(TextInputStyle.Short).setRequired(true))
);
}

if (interaction.values[0] === "other") {
modal = new ModalBuilder()
.setCustomId("other")
.setTitle("🌐 Other")
.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("help").setLabel("How can I help U").setStyle(TextInputStyle.Paragraph).setRequired(true))
);
}

return interaction.showModal(modal);
}

// ================= MODAL SUBMIT =================
if (interaction.isModalSubmit()) {

await interaction.deferReply({ ephemeral: true });

ticketData.count++;
fs.writeFileSync("./tickets.json", JSON.stringify(ticketData));
const number = String(ticketData.count).padStart(3,"0");

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

const fields = interaction.fields.fields.map(f => `**${f.customId}**: ${f.value}`).join("\n");

const buttons = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
);

await channel.send({
content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
embeds: [new EmbedBuilder().setTitle(`Ticket #${number}`).setDescription(fields).setColor(0x2b2d31)],
components: [buttons]
});

return interaction.editReply({ content: `Ticket Created ${channel}` });
}

// ================= BUTTONS =================
if (interaction.isButton()) {

if (interaction.customId === "claim") {
return interaction.reply({ content: "Ticket Claimed ✅", ephemeral: true });
}

if (interaction.customId === "close") {
await interaction.channel.setParent(CLOSED_CATEGORY_ID);
await interaction.channel.setName(`closed-${interaction.channel.name}`);
return interaction.reply("Ticket Closed ✅");
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
