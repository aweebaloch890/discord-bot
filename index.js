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
TextInputStyle,
ApplicationCommandOptionType
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

// ================= TICKET DATA =================
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
{ name: "user", description: "Seller", type: ApplicationCommandOptionType.User, required: true },
{ name: "product", description: "Product Name", type: ApplicationCommandOptionType.String, required: true },
{ name: "price", description: "Price", type: ApplicationCommandOptionType.String, required: true },
{ name: "rating", description: "Rating 1-5", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1, maxValue: 5 },
{ name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: true }
]
},
{ name: "kick", description: "Kick user", options: [{ name: "user", description: "Select user", type: ApplicationCommandOptionType.User, required: true }] },
{ name: "ban", description: "Ban user", options: [{ name: "user", description: "Select user", type: ApplicationCommandOptionType.User, required: true }] },
{ name: "unban", description: "Unban user", options: [{ name: "userid", description: "User ID", type: ApplicationCommandOptionType.String, required: true }] },
{ name: "timeout", description: "Timeout user", options: [{ name: "user", description: "Select user", type: ApplicationCommandOptionType.User, required: true }] }
]);

console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
try {

// ================= SLASH =================
if (interaction.isChatInputCommand()) {

if (interaction.commandName === "ticketpanel") {

if (interaction.channelId !== PANEL_CHANNEL_ID)
return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

const embed = new EmbedBuilder()
.setTitle("TEC TRADER")
.setColor(0x2b2d31)
.setDescription(`
Welcome to TEC TRADER Support!

Please select the appropriate ticket category from the menu below so our team can assist you quickly and efficiently.

Before opening a ticket:
• Make sure your issue has not already been resolved.
• Do not open multiple tickets for the same issue.
• Provide clear and complete details about your problem.
• Be patient while waiting for a response from our support team.

Our staff will respond as soon as possible.
`);

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
}

// ================= SELECT MENU → SHOW MODAL =================
if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {

const type = interaction.values[0];
const modal = new ModalBuilder()
.setCustomId(`modal_${type}`)
.setTitle(`${type.toUpperCase()} FORM`);

if (type === "purchase") {

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("payment").setLabel("Payment Method (JazzCash/Easypaisa/Bank/Crypto)").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("details").setLabel("Extra Details").setStyle(TextInputStyle.Paragraph).setRequired(false)
)
);

}

if (type === "replacement") {

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("order").setLabel("Order ID").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("transaction").setLabel("Transaction ID").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("problem").setLabel("Problem Description").setStyle(TextInputStyle.Paragraph).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("screenshot").setLabel("Screenshot Link").setStyle(TextInputStyle.Short).setRequired(false)
)
);

}

if (type === "notreceived") {

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("transaction").setLabel("Transaction ID").setStyle(TextInputStyle.Short).setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("proof").setLabel("Proof Screenshot Link").setStyle(TextInputStyle.Short).setRequired(false)
)
);

}

if (type === "other") {

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder().setCustomId("help").setLabel("How can we help you?").setStyle(TextInputStyle.Paragraph).setRequired(true)
)
);

}

return interaction.showModal(modal);
}

// ================= MODAL SUBMIT → CREATE TICKET =================
if (interaction.isModalSubmit()) {

await interaction.deferReply({ ephemeral: true });

ticketData.count++;
fs.writeFileSync("./tickets.json", JSON.stringify(ticketData));

const ticketNumber = ticketData.count;
const ticketName = `ticket-${ticketNumber}`;

const channel = await interaction.guild.channels.create({
name: ticketName,
type: ChannelType.GuildText,
parent: OPEN_CATEGORY_ID,
permissionOverwrites: [
{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
{ id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
{ id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
]
});

const fields = interaction.fields.fields.map(f => ({
name: f.customId.toUpperCase(),
value: f.value
}));

const embed = new EmbedBuilder()
.setColor(0x2b2d31)
.setTitle(`Ticket #${ticketNumber}`)
.addFields(fields)
.setFooter({ text: `Opened by ${interaction.user.tag}` });

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
);

await channel.send({
content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
embeds: [embed],
components: [row]
});

interaction.editReply({ content: `Ticket created: ${channel}` });
}

// ================= BUTTONS =================
if (interaction.isButton()) {

if (interaction.customId === "claim") {
if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
return interaction.reply({ content: "Staff Only ❌", ephemeral: true });

await interaction.reply(`Ticket claimed by <@${interaction.user.id}>`);
}

if (interaction.customId === "close") {

if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
return interaction.reply({ content: "Staff Only ❌", ephemeral: true });

const messages = await interaction.channel.messages.fetch({ limit: 100 });
let transcript = "";
messages.reverse().forEach(m => {
transcript += `[${m.author.tag}] ${m.content}\n`;
});

fs.writeFileSync(`./transcript-${interaction.channel.name}.txt`, transcript);

await interaction.channel.setParent(CLOSED_CATEGORY_ID);
await interaction.channel.setName(`closed-${interaction.channel.name}`);

await interaction.reply("Ticket Closed & Transcript Saved ✅");
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
