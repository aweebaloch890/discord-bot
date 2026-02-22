// Safe ENV check
if (!process.env.TOKEN) {
  console.error("❌ TOKEN not found in environment variables!");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("❌ CLIENT_ID not found in environment variables!");
  process.exit(1);
}

if (!process.env.GUILD_ID) {
  console.error("❌ GUILD_ID not found in environment variables!");
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
    // ✅ FIX: seller now USER type
    .addUserOption(o => o.setName("seller").setRequired(true).setDescription("Seller"))
    .addIntegerOption(o => o.setName("rating").setRequired(true).setDescription("Rating 1-5"))
    .addStringOption(o => o.setName("reason").setRequired(true).setDescription("Reason")),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start a giveaway")
    .addIntegerOption(o => o.setName("duration").setRequired(true).setDescription("Seconds"))
    .addStringOption(o => o.setName("prize").setRequired(true).setDescription("Prize"))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(cmd => cmd.toJSON()) }
  );
  console.log("✅ Slash Commands Registered");
})();

// ✅ FIX: ready → clientReady
client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// ================= AUTO MOD =================

const spamMap = new Map();
const badWords = ["badword1","badword2"];

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(()=>{});
      message.channel.send(`${message.author}, links are not allowed.`);
    }
  }

  if (badWords.some(w => message.content.toLowerCase().includes(w))) {
    await message.delete().catch(()=>{});
    message.channel.send(`${message.author}, watch your language.`);
  }

  const now = Date.now();
  const userData = spamMap.get(message.author.id) || { count: 0, last: now };

  if (now - userData.last < 5000) {
    userData.count++;
    if (userData.count >= 5) {
      await message.member.timeout(10000).catch(()=>{});
      message.channel.send(`${message.author} muted for spam.`);
      userData.count = 0;
    }
  } else {
    userData.count = 1;
  }

  userData.last = now;
  spamMap.set(message.author.id, userData);
});


// ================= INTERACTIONS =================

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    // ---------------- TICKET PANEL ----------------
    if (interaction.commandName === "ticketpanel") {

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("Tec Trader | TICKETS")
        .setDescription(
          "**🚨 ATTENTION!**\n" +
          "➤ Do not open a TICKET without a valid reason.\n" +
          "➤ Read our #📋・Rules to avoid warnings or bans.\n\n" +
          "By Tec Trader"
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("nitro").setLabel("Nitro").setEmoji("💎").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("boost").setLabel("Server Boost").setEmoji("🚀").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("account").setLabel("Account").setEmoji("🌐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("entertainment").setLabel("Entertainment").setEmoji("🎬").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("other").setLabel("Other").setEmoji("🔄").setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds:[embed], components:[row] });
    }

    // ---------------- VOUCH ----------------
    if (interaction.commandName === "vouch") {

      const product = interaction.options.getString("product");
      const price = interaction.options.getString("price");
      // ✅ FIX: getUser
      const seller = interaction.options.getUser("seller");
      const rating = interaction.options.getInteger("rating");
      const reason = interaction.options.getString("reason");

      const stars = "⭐".repeat(rating);
      const vouchID = crypto.randomBytes(3).toString("hex").toUpperCase();

      const embed = new EmbedBuilder()
        .setColor("#ff00aa")
        .setTitle("💬 • New Vouch Recorded!")
        .setThumbnail(LOGO_URL)
        .addFields(
          { name:"🛒 Product", value:`${product}`, inline:true },
          { name:"💲 Price", value:`${price}`, inline:true },
          { name:"👤 Seller", value:`${seller}`, inline:true },
          { name:"⭐ Rating", value:`${stars} (${rating}/5)` },
          { name:"📝 Reason", value:`${reason}` },
          { name:"🙌 Vouched By", value:`${interaction.user}`, inline:true },
          { name:"🆔 Vouch ID", value:`${vouchID}`, inline:true },
          { name:"⏰ Timestamp", value:`<t:${Math.floor(Date.now()/1000)}:R>`, inline:true }
        )
        .setFooter({ text:"Tec Trader" })
        .setTimestamp();

      return interaction.reply({ embeds:[embed] });
    }

  }

});

client.login(TOKEN);
