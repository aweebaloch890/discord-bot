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

// OPEN CATEGORIES
const CATEGORY = {
purchase: "1477273688490381394",
notreceived: "1477273792287084614",
replacement: "1477273914928271391",
other: "1477273728575475762"
};

// CLOSED CATEGORIES
const CLOSED_CATEGORY = {
purchase: "1477273688490381394",
notreceived: "1477273792287084614",
replacement: "1477273914928271391",
other: "1477273728575475762"
};

// EMOJIS
const EMOJI = {
purchase: "🛒",
replacement: "🔁",
notreceived: "❌",
other: "🌐"
};

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

// ================= READY =================
client.once("clientReady", async () => {

console.log(`Logged in as ${client.user.tag}`);

await client.application.commands.set([
{ name: "ticketpanel", description: "Send ticket panel" }
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
.setDescription(`Select ticket category below`);

const select = new StringSelectMenuBuilder()
.setCustomId("ticket_select")
.setPlaceholder("Select ticket type")
.addOptions(
{ label: "Purchase", value: "purchase", emoji: "🛒" },
{ label: "Replacement", value: "replacement", emoji: "🔁" },
{ label: "Not Received", value: "notreceived", emoji: "❌" },
{ label: "Other", value: "other", emoji: "🌐" }
);

return interaction.reply({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(select)]
});

}
}

// ================= SELECT =================
if (interaction.isStringSelectMenu()) {

const type = interaction.values[0];

const modal = new ModalBuilder()
.setCustomId(`modal_${type}`)
.setTitle(`${type} form`);

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("details")
.setLabel("Enter Details")
.setStyle(TextInputStyle.Paragraph)
.setRequired(true)
)
);

return interaction.showModal(modal);

}

// ================= MODAL SUBMIT =================
if (interaction.isModalSubmit()) {

const type = interaction.customId.split("_")[1];

await interaction.deferReply({ ephemeral: true });

const username = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g,"");

const channelName = `${EMOJI[type]}-${username}`;

const channel = await interaction.guild.channels.create({

name: channelName,
type: ChannelType.GuildText,
parent: CATEGORY[type],

permissionOverwrites: [

{
id: interaction.guild.id,
deny: [PermissionsBitField.Flags.ViewChannel]
},

{
id: interaction.user.id,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},

{
id: STAFF_ROLE_ID,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}

]

});

// save ticket type
channel.setTopic(type);

let fields = [];

interaction.fields.fields.forEach(f=>{
fields.push({
name: f.customId,
value: f.value
});
});

const embed = new EmbedBuilder()
.setColor(0x2b2d31)
.setTitle(`${EMOJI[type]} Ticket Opened`)
.addFields(fields)
.setFooter({
text: `Opened by ${interaction.user.tag}`
});

const buttons = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("claim")
.setLabel("Claim")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("close")
.setLabel("Close")
.setStyle(ButtonStyle.Danger)

);

await channel.send({

content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
embeds: [embed],
components: [buttons]

});

interaction.editReply({
content: `Ticket created: ${channel}`
});

}

// ================= BUTTON =================
if (interaction.isButton()) {

const channel = interaction.channel;
const type = channel.topic;

// CLAIM
if (interaction.customId === "claim") {

if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
return interaction.reply({
content: "Staff only",
ephemeral: true
});

return interaction.reply(`Claimed by <@${interaction.user.id}>`);

}

// CLOSE
if (interaction.customId === "close") {

await interaction.deferReply({ ephemeral: true });

const messages = await channel.messages.fetch({ limit: 100 });

let transcript = "";

messages.reverse().forEach(m=>{
transcript += `[${m.author.tag}] ${m.content}\n`;
});

const fileName = `transcript-${channel.name}.txt`;

fs.writeFileSync(fileName, transcript);

// DM USER
const overwrite = channel.permissionOverwrites.cache.find(x=>x.type===1);

if (overwrite){

const user = await client.users.fetch(overwrite.id).catch(()=>{});

if(user){

await user.send({

content: "Ticket closed. Transcript below",
files: [fileName]

}).catch(()=>{});

}

await channel.permissionOverwrites.edit(overwrite.id,{
ViewChannel:false
});

}

// move closed category
await channel.setParent(CLOSED_CATEGORY[type]);

await channel.setName(`closed-${channel.name}`);

interaction.editReply({
content:"Ticket Closed ✅"
});

}

}

}catch(err){

console.log(err);

if(!interaction.replied)
interaction.reply({
content:"Error handled",
ephemeral:true
}).catch(()=>{});

}

});

// ================= KEEP ALIVE =================
http.createServer((req,res)=>res.end("Running")).listen(process.env.PORT||3000);

client.login(process.env.TOKEN);
