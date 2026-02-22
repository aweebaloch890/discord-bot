// ================= ENV CHECK =================
if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  REST,
  Routes
} = require("discord.js");

const crypto = require("crypto");

const CATEGORY_ID = "1337265672597672079";
const STAFF_ROLE_ID = "1397441836330651798";
const LOGO_URL = "https://cdn.discordapp.com/attachments/1382467950186987521/1475164824219422873/tec_trader-removebg-preview_1.png";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});


// ================= SLASH COMMANDS =================
const commands = [

  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Send ticket panel"),

  new SlashCommandBuilder()
    .setName("vouch")
    .setDescription("Create a vouch")
    .addStringOption(o => o.setName("product").setRequired(true).setDescription("Product"))
    .addStringOption(o => o.setName("price").setRequired(true).setDescription("Price"))
    .addUserOption(o => o.setName("seller").setRequired(true).setDescription("Seller"))
    .addIntegerOption(o => o.setName("rating").setRequired(true).setDescription("Rating (1-5)"))
    .addStringOption(o => o.setName("reason").setRequired(true).setDescription("Reason"))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(cmd => cmd.toJSON()) }
  );
  console.log("✅ Slash Commands Registered");
})();

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  try {

    // ================= SLASH COMMANDS =================
    if (interaction.isChatInputCommand()) {

      // -------- TICKET PANEL --------
      if (interaction.commandName === "ticketpanel") {

        const embed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setTitle("Tec Trader | TICKETS")
          .setDescription(
            "🚨 **ATTENTION!**\n" +
            "➤ Do not open a ticket without reason.\n" +
            "➤ Follow server rules.\n\n" +
            "By Tec Trader"
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_open").setLabel("Open Ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // -------- VOUCH SYSTEM --------
      if (interaction.commandName === "vouch") {

        await interaction.deferReply(); // FIX interaction failed

        const product = interaction.options.getString("product");
        const price = interaction.options.getString("price");
        const seller = interaction.options.getUser("seller");
        const rating = interaction.options.getInteger("rating");
        const reason = interaction.options.getString("reason");

        const stars = "⭐".repeat(rating);
        const vouchID = crypto.randomBytes(3).toString("hex").toUpperCase();

        const embed = new EmbedBuilder()
          .setColor("#9b00ff")
          .setTitle("✨ New Vouch")
          .setThumbnail(LOGO_URL)
          .addFields(
            { name: "🛒 Product", value: product, inline: true },
            { name: "💲 Price", value: price, inline: true },
            { name: "👤 Seller", value: `${seller}`, inline: true },
            { name: "⭐ Rating", value: `${stars} (${rating}/5)` },
            { name: "📝 Reason", value: reason },
            { name: "🙌 Vouched By", value: `${interaction.user}`, inline: true },
            { name: "🆔 Vouch ID", value: vouchID, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

      if (interaction.customId === "ticket_open") {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        const closeBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          content: `${interaction.user} <@&${STAFF_ROLE_ID}>`,
          components: [closeBtn]
        });

        return interaction.editReply({ content: `✅ Ticket created: ${channel}` });
      }

      if (interaction.customId === "close_ticket") {
        await interaction.reply({ content: "🔒 Closing ticket...", ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
      }
    }

  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(()=>{});
    }
  }

});

client.login(TOKEN);
