ab dekh sai hai 


require("dotenv").config();

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
const LOGO_URL = "https://cdn.discordapp.com/attachments/1382467950186987521/1475164824219422873/tec_trader-removebg-preview_1.png?ex=699c7dcd&is=699b2c4d&hm=05c83b4aa60b897d7c1c89a95e325787e55af73394e0f2903dc92ccccf550e66&";

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

  new SlashCommandBuilder().setName("ticketpanel").setDescription("Send ticket panel"),

  new SlashCommandBuilder()
    .setName("vouch")
    .setDescription("Create a vouch")
    .addStringOption(o => o.setName("product").setRequired(true).setDescription("Product"))
    .addStringOption(o => o.setName("price").setRequired(true).setDescription("Price"))
    .addStringOption(o => o.setName("seller").setRequired(true).setDescription("Seller"))
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
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Slash Commands Registered");
})();

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// ================= AUTO MOD =================

const spamMap = new Map();
const badWords = ["badword1","badword2"];

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // Anti Link
  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(()=>{});
      message.channel.send(`${message.author}, links are not allowed.`);
    }
  }

  // Bad Word
  if (badWords.some(w => message.content.toLowerCase().includes(w))) {
    await message.delete().catch(()=>{});
    message.channel.send(`${message.author}, watch your language.`);
  }

  // Anti Spam
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

  // ===== SLASH COMMANDS =====
  if (interaction.isChatInputCommand()) {

    // ---------------- TICKET PANEL ----------------
    if (interaction.commandName === "ticketpanel") {

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("Tec Trader | TICKETS")
        .setDescription(
          "**🚨 ATTENTION!**\n" +
          "➤ Do not open a TICKET without a valid reason.\n" +
          "➤ Read our #📋・tos to avoid warnings or bans.\n\n" +
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
      const seller = interaction.options.getString("seller");
      const rating = interaction.options.getInteger("rating");
      const reason = interaction.options.getString("reason");

      const stars = "⭐".repeat(rating);
      const vouchID = crypto.randomBytes(3).toString("hex").toUpperCase();

      const embed = new EmbedBuilder()
        .setColor("#ff00aa")
        .setTitle("💬 • New Vouch Recorded!")
        .setThumbnail(LOGO_URL)
        .addFields(
          { name:"🛒 Product", value:`Paramount +`, inline:true },
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

    // ---------------- MODERATION ----------------
    if (interaction.commandName === "ban") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return interaction.reply({content:"No permission",ephemeral:true});
      const user = interaction.options.getMember("user");
      await user.ban();
      return interaction.reply(`🔨 Banned ${user.user.tag}`);
    }

    if (interaction.commandName === "kick") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return interaction.reply({content:"No permission",ephemeral:true});
      const user = interaction.options.getMember("user");
      await user.kick();
      return interaction.reply(`👢 Kicked ${user.user.tag}`);
    }

    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("user");
      return interaction.reply(`⚠️ ${user.tag} has been warned.`);
    }

    // ---------------- GIVEAWAY ----------------
    if (interaction.commandName === "giveaway") {

      const duration = interaction.options.getInteger("duration");
      const prize = interaction.options.getString("prize");

      const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY")
        .setDescription(`Prize: **${prize}**\nReact with 🎉 to enter!\nEnds in ${duration}s`)
        .setColor("Gold");

      const msg = await interaction.reply({ embeds:[embed], fetchReply:true });
      await msg.react("🎉");

      setTimeout(async ()=>{
        const fetched = await msg.fetch();
        const users = await fetched.reactions.cache.get("🎉").users.fetch();
        const winner = users.filter(u=>!u.bot).random();
        if(!winner) return interaction.followUp("No valid participants.");
        interaction.followUp(`🎉 Winner: ${winner}`);
      }, duration*1000);
    }

  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (["nitro","boost","account","entertainment","other"].includes(interaction.customId)) {

      const channel = await interaction.guild.channels.create({
        name:`ticket-${interaction.user.username}`,
        type:ChannelType.GuildText,
        parent:CATEGORY_ID,
        permissionOverwrites:[
          {id:interaction.guild.id, deny:[PermissionsBitField.Flags.ViewChannel]},
          {id:interaction.user.id, allow:[PermissionsBitField.Flags.ViewChannel]},
          {id:STAFF_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel]}
        ]
      });

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      channel.send({content:`${interaction.user} <@&${STAFF_ROLE_ID}>`,components:[closeBtn]});
      interaction.reply({content:`Ticket created: ${channel}`,ephemeral:true});
    }

    if (interaction.customId === "close_ticket") {

      const messages = await interaction.channel.messages.fetch({limit:100});
      const transcript = messages.map(m=>`${m.author.tag}: ${m.content}`).reverse().join("\n");

      await interaction.user.send({
        embeds:[new EmbedBuilder()
          .setTitle("📄 Ticket Transcript")
          .setDescription("```"+transcript.slice(0,4000)+"```")]
      }).catch(()=>{});

      await interaction.reply("Closing ticket...");
      setTimeout(()=>interaction.channel.delete(),3000);
    }

  }

});

client.login(TOKEN);
