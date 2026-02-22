require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ================= DATABASE =================
let vouches = [];
if (fs.existsSync('./vouches.json')) {
    vouches = JSON.parse(fs.readFileSync('./vouches.json'));
}

// ================= RGB COLOR SYSTEM =================
let hue = 0;
function getRGB() {
    hue = (hue + 30) % 360;
    return `hsl(${hue}, 100%, 50%)`;
}

// ================= READY =================
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        {
            name: 'vouch',
            description: 'Give premium RGB vouch',
            options: [
                { name: 'seller', type: 6, required: true, description: 'Select seller' },
                { name: 'product', type: 3, required: true, description: 'Product name' },
                { name: 'price', type: 3, required: true, description: 'Price' },
                { 
                    name: 'rating', 
                    type: 4, 
                    required: true, 
                    description: 'Rating 1-5',
                    choices: [
                        { name: '1 Star', value: 1 },
                        { name: '2 Stars', value: 2 },
                        { name: '3 Stars', value: 3 },
                        { name: '4 Stars', value: 4 },
                        { name: '5 Stars', value: 5 }
                    ]
                },
                { name: 'reason', type: 3, required: false, description: 'Reason' }
            ]
        },
        {
            name: 'message',
            description: 'Send embed message',
            options: [
                { name: 'channel', type: 7, required: true, description: 'Select channel' },
                { name: 'text', type: 3, required: true, description: 'Message text' }
            ]
        },
        { name: 'kick', description: 'Kick user', options: [{ name: 'user', type: 6, required: true, description: 'User' }] },
        { name: 'timeout', description: 'Timeout user', options: [{ name: 'user', type: 6, required: true, description: 'User' }] }
    ];

    await client.application.commands.set(commands, process.env.GUILD_ID);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        // ================= VOUCH SYSTEM =================
        if (interaction.commandName === 'vouch') {

            const seller = interaction.options.getUser('seller');
            const product = interaction.options.getString('product');
            const price = interaction.options.getString('price');
            const rating = interaction.options.getInteger('rating');
            const reason = interaction.options.getString('reason') || "No reason provided.";

            if (seller.id === interaction.user.id)
                return interaction.reply({ content: "❌ Ap khud ko vouch nahi de sakte!", ephemeral: true });

            const stars = "⭐".repeat(rating);
            const vouchID = uuidv4().split("-")[0].toUpperCase();

            const embed = new EmbedBuilder()
                .setColor(getRGB())
                .setTitle("💎 • New Vouch Recorded!")
                .addFields(
                    { name: "🛒 Product", value: product, inline: true },
                    { name: "💲 Price", value: price, inline: true },
                    { name: "👤 Seller", value: `<@${seller.id}>`, inline: false },
                    { name: "⭐ Rating", value: `${stars} (${rating}/5)`, inline: false },
                    { name: "📝 Reason", value: reason, inline: false },
                    { name: "🙌 Vouched By", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "🆔 Vouch ID", value: vouchID, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: "RGB Premium Vouch System" });

            vouches.push({
                id: vouchID,
                seller: seller.id,
                product,
                price,
                rating,
                reason,
                vouchedBy: interaction.user.id,
                date: new Date()
            });

            fs.writeFileSync('./vouches.json', JSON.stringify(vouches, null, 2));

            interaction.reply({ embeds: [embed] });
        }

        // ================= MESSAGE COMMAND =================
        if (interaction.commandName === 'message') {
            const channel = interaction.options.getChannel('channel');
            const text = interaction.options.getString('text');

            const embed = new EmbedBuilder()
                .setColor(getRGB())
                .setDescription(text)
                .setTimestamp();

            channel.send({ embeds: [embed] });
            interaction.reply({ content: "Message sent ✅", ephemeral: true });
        }

        // ================= KICK =================
        if (interaction.commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember('user');
            await member.kick();
            interaction.reply(`👢 ${member.user.tag} kicked`);
        }

        // ================= TIMEOUT =================
        if (interaction.commandName === 'timeout') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember('user');
            await member.timeout(10 * 60 * 1000);
            interaction.reply(`⏳ ${member.user.tag} timeout 10 min`);
        }
    }

    // ================= TICKET BUTTONS =================
    if (interaction.isButton()) {

        if (interaction.customId.startsWith("ticket_")) {

            const type = interaction.customId.split("_")[1];

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const closeBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            channel.send({
                content: `🎫 Ticket Type: **${type}**`,
                components: [closeBtn]
            });

            interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
        }

        if (interaction.customId === "close_ticket") {
            await interaction.channel.delete();
        }
    }
});

// ================= ANTI LINK + ANTI SPAM =================
const spamMap = new Map();

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    // Anti-Link
    if (message.content.match(/https?:\/\/\S+/) && 
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

        message.delete().catch(() => {});
        message.channel.send(`${message.author} ❌ Links allowed nahi.`);
    }

    // Anti-Spam (Fixed)
    if (!spamMap.has(message.author.id)) {
        spamMap.set(message.author.id, { count: 1, time: Date.now() });
        setTimeout(() => spamMap.delete(message.author.id), 5000);
    } else {
        const data = spamMap.get(message.author.id);
        data.count++;
        if (data.count >= 6) {
            message.member.timeout(5 * 60 * 1000).catch(() => {});
            message.channel.send(`${message.author} spam kar raha tha. Timeout.`);
            spamMap.delete(message.author.id);
        }
    }

    // Ticket Panel
    if (message.content === "!ticketpanel") {

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket_support").setLabel("Support").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("ticket_account").setLabel("Account").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("ticket_nitro").setLabel("Nitro").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("ticket_replace").setLabel("Replace Product").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_boost").setLabel("Server Boosts").setStyle(ButtonStyle.Danger)
        );

        message.channel.send({ content: "🎫 Open Ticket Below", components: [row] });
    }
});

client.login(process.env.TOKEN);
