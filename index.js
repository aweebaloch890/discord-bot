const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  SlashCommandBuilder,
  Routes,
  REST
} = require("discord.js");

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const transcripts = require("discord-html-transcripts");
const config = require("./config.json");

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ================= TOKEN SAFE CHECK ================= */

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN not found! Railway Variables check karo.");
  process.exit(1);
}

if (typeof TOKEN !== "string" || TOKEN.split(".").length !== 3) {
  console.error("❌ Invalid TOKEN format! Token galat ya incomplete hai.");
  process.exit(1);
}

console.log("✅ TOKEN loaded. Length:", TOKEN.length);

/* ================= DATABASE INIT ================= */

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./data/reps.json")) fs.writeFileSync("./data/reps.json", "{}");

const reps = JSON.parse(fs.readFileSync("./data/reps.json"));

/* ================= READY EVENT ================= */

client.once("ready", async () => {
  console.log(`🚀 ${client.user.tag} is online`);

  const commands = [
    new SlashCommandBuilder()
      .setName("announcement")
      .setDescription("Send announcement")
      .addStringOption(opt =>
        opt.setName("message").setDescription("Message").setRequired(true)
      )
      .addChannelOption(opt =>
        opt.setName("channel").setDescription("Channel").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("vouch")
      .setDescription("Create vouch")
      .addUserOption(opt =>
        opt.setName("seller").setDescription("Seller").setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("product").setDescription("Product").setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("price").setDescription("Price").setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName("rating").setDescription("1-5").setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("reason").setDescription("Reason").setRequired(false)
      )
      .addAttachmentOption(opt =>
        opt.setName("image").setDescription("Proof Image")
      ),

    new SlashCommandBuilder()
      .setName("ticketpanel")
      .setDescription("Create ticket panel"),

    new SlashCommandBuilder()
      .setName("close")
      .setDescription("Close ticket")
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN.trim());

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Slash command error:", err.message);
  }
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "announcement") {
      const msg = interaction.options.getString("message");
      const channel = interaction.options.getChannel("channel");

      const embed = new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setDescription(msg)
        .setColor("Blue")
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      return interaction.reply({ content: "✅ Announcement sent!", ephemeral: true });
    }

    if (interaction.commandName === "vouch") {
      const seller = interaction.options.getUser("seller");
      const product = interaction.options.getString("product");
      const price = interaction.options.getString("price");
      const rating = interaction.options.getInteger("rating");
      const reason = interaction.options.getString("reason") || "No reason provided.";
      const image = interaction.options.getAttachment("image");

      const id = uuidv4().slice(0, 8);

      if (!reps[seller.id]) reps[seller.id] = 0;
      reps[seller.id] += 1;
      fs.writeFileSync("./data/reps.json", JSON.stringify(reps, null, 2));

      const embed = new EmbedBuilder()
        .setTitle("⭐ New Vouch Recorded!")
        .addFields(
          { name: "Product", value: product, inline: true },
          { name: "Price", value: price, inline: true },
          { name: "Seller", value: `<@${seller.id}>`, inline: true },
          { name: "Rating", value: "⭐".repeat(rating), inline: true },
          { name: "Reason", value: reason }
        )
        .setFooter({ text: `Vouch ID: ${id}` })
        .setTimestamp();

      if (image) embed.setImage(image.url);

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "ticketpanel") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_menu")
        .setPlaceholder("Select ticket type")
        .addOptions([
          { label: "Product not received", value: "not_received" },
          { label: "Support", value: "support" },
          { label: "Replace", value: "replace" },
          { label: "Purchase", value: "purchase" }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      const embed = new EmbedBuilder()
        .setTitle("🎫 Support System")
        .setDescription("Select an option below")
        .setColor("Purple");

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === "close") {
      if (!interaction.channel.name.startsWith("ticket-"))
        return interaction.reply({ content: "❌ Not a ticket!", ephemeral: true });

      const attachment = await transcripts.createTranscript(interaction.channel);
      await interaction.channel.send({ files: [attachment] });

      setTimeout(() => interaction.channel.delete(), 3000);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_menu") {
      const guild = interaction.guild;

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      await channel.send(`Hello <@${interaction.user.id}> support will be with you shortly.`);
      return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }
  }
});

/* ================= PREFIX COMMANDS ================= */

client.on("messageCreate", async message => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "ping") return message.reply("🏓 Pong!");

  if (cmd === "clear") {
    const amount = parseInt(args[0]);
    if (!amount) return;
    await message.channel.bulkDelete(amount);
  }

  if (cmd === "ban") {
    const member = message.mentions.members.first();
    if (member) await member.ban();
  }

  if (cmd === "kick") {
    const member = message.mentions.members.first();
    if (member) await member.kick();
  }

  if (cmd === "help") {
    message.reply("Commands: !ban !kick !clear !ping");
  }
});

/* ================= LOGIN ================= */

client.login(TOKEN.trim())
  .then(() => console.log("✅ Bot login successful"))
  .catch(err => {
    console.error("❌ Login Failed:", err.message);
  });
