
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
} = require("discord.js");
const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1405179388223291552";

// Ticket categories
const CATEGORY_IDS = {
  purchase: "1477273688490381394",
  notreceived: "1477273792287084614",
  replacement: "1477273914928271391",
  other: "1477273728575475762",
};

// Ticket emojis
const EMOJIS = {
  purchase: "🛒",
  notreceived: "❌",
  replacement: "🔁",
  other: "🌐",
};

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ================= TICKET DATA =================
let ticketData = fs.existsSync("./tickets.json")
  ? JSON.parse(fs.readFileSync("./tickets.json"))
  : {};

// ================= READY =================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.commands.set([
    { name: "ticketpanel", description: "Send ticket panel" },
  ]);

  console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {
  try {
    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand() && interaction.commandName === "ticketpanel") {
      if (interaction.channelId !== PANEL_CHANNEL_ID)
        return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("TEC TRADER")
        .setColor(0x2b2d31)
        .setDescription(`
👋 **Welcome to TEC TRADER Support!**

Please select the appropriate ticket category below. 🎫

📌 **Before opening a ticket:**
• ✅ Make sure your issue has not already been resolved.
• 🚫 Do not open multiple tickets for the same issue.
• 📝 Provide clear and complete details.
• ⏳ Be patient while waiting for support.
`);

      const select = new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("🎟️ Select ticket type")
        .addOptions(
          { label: "🛒 Purchase", value: "purchase" },
          { label: "🔁 Replacement", value: "replacement" },
          { label: "❌ Not Received", value: "notreceived" },
          { label: "🌐 Other", value: "other" }
        );

      return interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select)],
      });
    }

    // ===== SELECT MENU → MODAL =====
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      const type = interaction.values[0];
      const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle(`${EMOJIS[type]} ${type.toUpperCase()} FORM`);

      if (type === "purchase") {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setRequired(true)
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

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {
      await interaction.deferReply({ ephemeral: true });

      const type = interaction.customId.replace("modal_", "");
      const ticketName = `${EMOJIS[type]}-${interaction.user.username}`;

      const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: CATEGORY_IDS[type],
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
      });

      let fields = [];
      interaction.fields.fields.forEach(f => {
        fields.push({ name: f.customId.toUpperCase(), value: f.value || "N/A" });
      });

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`Ticket - ${interaction.user.username}`)
        .addFields(fields)
        .setFooter({ text: `Opened by ${interaction.user.tag}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
      return interaction.editReply({ content: `Ticket created: ${channel}` });
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {
      if (interaction.customId === "claim") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
          return interaction.reply({ content: "Staff Only ❌", ephemeral: true });
        return interaction.reply(`Ticket claimed by <@${interaction.user.id}>`);
      }

      if (interaction.customId === "close") {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;

        const messages = await channel.messages.fetch({ limit: 100 });
        let transcript = "";
        messages.reverse().forEach((m) => {
          transcript += `[${m.author.tag}] ${m.content}\n`;
        });

        fs.writeFileSync(`./transcript-${channel.name}.txt`, transcript);

        const userOverwrite = channel.permissionOverwrites.cache.find(p => p.type === 1);
        if (userOverwrite) {
          const user = await client.users.fetch(userOverwrite.id).catch(() => { });
          if (user) {
            await user.send({
              content: `Your ticket ${channel.name} has been closed.\nHere is the transcript:`,
              files: [`./transcript-${channel.name}.txt`],
            }).catch(() => { });
          }
          await channel.permissionOverwrites.edit(userOverwrite.id, { ViewChannel: false });
        }

        await channel.setName(`closed-${channel.name}`);
        return interaction.editReply({ content: "Ticket Closed & Transcript Sent ✅" });
      }
    }
  } catch (err) {
    console.log(err);
    if (!interaction.replied)
      interaction.reply({ content: "Error handled safely ✅", ephemeral: true }).catch(() => { });
  }
});

// ================= KEEP ALIVE =================
http.createServer((req, res) => { res.end("Running"); }).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
