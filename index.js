const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  SlashCommandBuilder,
  Routes,
  REST
} = require("discord.js");

const fs = require("fs");
const moment = require("moment");
const ms = require("ms");
const { v4: uuidv4 } = require("uuid");
const transcripts = require("discord-html-transcripts");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;

// JSON DATABASE INIT
if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./data/warns.json")) fs.writeFileSync("./data/warns.json", "{}");
if (!fs.existsSync("./data/tickets.json")) fs.writeFileSync("./data/tickets.json", "{}");
if (!fs.existsSync("./data/vouches.json")) fs.writeFileSync("./data/vouches.json", "{}");
if (!fs.existsSync("./data/reps.json")) fs.writeFileSync("./data/reps.json", "{}");

const warns = JSON.parse(fs.readFileSync("./data/warns.json"));
const tickets = JSON.parse(fs.readFileSync("./data/tickets.json"));
const vouches = JSON.parse(fs.readFileSync("./data/vouches.json"));
const reps = JSON.parse(fs.readFileSync("./data/reps.json"));

client.once("ready", async () => {
  console.log(`${client.user.tag} is online`);

  const commands = [
    new SlashCommandBuilder()
      .setName("announcement")
      .setDescription("Send announcement")
      .addStringOption(opt => opt.setName("message").setDescription("Message").setRequired(true))
      .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),

    new SlashCommandBuilder()
      .setName("vouch")
      .setDescription("Create vouch")
      .addUserOption(opt => opt.setName("seller").setDescription("Seller").setRequired(true))
      .addStringOption(opt => opt.setName("product").setDescription("Product").setRequired(true))
      .addStringOption(opt => opt.setName("price").setDescription("Price").setRequired(true))
      .addIntegerOption(opt => opt.setName("rating").setDescription("1-5").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason").setRequired(false))
      .addAttachmentOption(opt => opt.setName("image").setDescription("Proof Image")),

    new SlashCommandBuilder()
      .setName("ticketpanel")
      .setDescription("Create ticket panel"),

    new SlashCommandBuilder()
      .setName("close")
      .setDescription("Close ticket")
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands.map(cmd => cmd.toJSON()) }
  );
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {

    // ANNOUNCEMENT
    if (interaction.commandName === "announcement") {
      const msg = interaction.options.getString("message");
      const channel = interaction.options.getChannel("channel");

      const embed = new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setDescription(msg)
        .setColor("Blue")
        .setTimestamp();

      channel.send({ embeds: [embed] });
      interaction.reply({ content: "Announcement sent!", ephemeral: true });
    }

    // VOUCH
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

      interaction.reply({ embeds: [embed] });
    }

    // TICKET PANEL
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

      interaction.reply({ embeds: [embed], components: [row] });
    }

    // CLOSE
    if (interaction.commandName === "close") {
      if (!interaction.channel.name.startsWith("ticket-"))
        return interaction.reply({ content: "Not a ticket!", ephemeral: true });

      const attachment = await transcripts.createTranscript(interaction.channel);
      interaction.channel.send({ files: [attachment] });

      setTimeout(() => interaction.channel.delete(), 3000);
    }

  }

  // TICKET CREATE
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_menu") {

      const guild = interaction.guild;
      const category = guild.channels.cache.find(c => c.name === config.ticketCategoryName);

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category?.id,
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

      channel.send(`Hello <@${interaction.user.id}> support will be with you shortly.`);
      interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }
  }
});

// PREFIX COMMANDS
client.on("messageCreate", async message => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "ping") message.reply("Pong!");

  if (cmd === "clear") {
    const amount = parseInt(args[0]);
    message.channel.bulkDelete(amount);
  }

  if (cmd === "ban") {
    const member = message.mentions.members.first();
    if (member) member.ban();
  }

  if (cmd === "kick") {
    const member = message.mentions.members.first();
    if (member) member.kick();
  }

  if (cmd === "help") {
    message.reply("Commands: !ban !kick !clear !ping");
  }
});

client.login(TOKEN);