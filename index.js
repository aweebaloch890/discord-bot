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
const http = require('http');

const STAFF_ROLE_ID = "1397441836330651798"; // 🔥 CHANGE THIS

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ================= READY =================
client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [

        { name: 'ticketpanel', description: 'Send ticket panel' },

        {
            name: 'kick',
            description: 'Kick a user',
            options: [
                { name: 'user', description: 'User to kick', type: 6, required: true },
                { name: 'reason', description: 'Reason', type: 3, required: false }
            ]
        },

        {
            name: 'ban',
            description: 'Ban a user',
            options: [
                { name: 'user', description: 'User to ban', type: 6, required: true },
                { name: 'reason', description: 'Reason', type: 3, required: false }
            ]
        },

        {
            name: 'timeout',
            description: 'Timeout a user',
            options: [
                { name: 'user', description: 'User to timeout', type: 6, required: true },
                { name: 'duration', description: 'Minutes', type: 4, required: true }
            ]
        },

        {
            name: 'mute',
            description: 'Mute user (timeout 10 min)',
            options: [
                { name: 'user', description: 'User to mute', type: 6, required: true }
            ]
        }

    ];

    await client.application.commands.set(commands, process.env.GUILD_ID);
    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

    // ================= SLASH =================
    if (interaction.isChatInputCommand()) {

        // ===== TICKET PANEL =====
        if (interaction.commandName === "ticketpanel") {

            const embed = new EmbedBuilder()
                .setTitle("Elite Services | TICKETS")
                .setDescription("⚠️ **ATTENTION!**\nDo not open a TICKET without a valid reason.")
                .setColor(0x5865F2);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("support").setLabel("Support").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("account").setLabel("Account").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("nitro").setLabel("Nitro").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("replace").setLabel("Replace Product").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("boost").setLabel("Server Boost").setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // ===== KICK =====
        if (interaction.commandName === "kick") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember("user");
            await member.kick();
            return interaction.reply("User kicked ✅");
        }

        // ===== BAN =====
        if (interaction.commandName === "ban") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember("user");
            await member.ban();
            return interaction.reply("User banned ✅");
        }

        // ===== TIMEOUT =====
        if (interaction.commandName === "timeout") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
                return interaction.reply({ content: "No permission", ephemeral: true });

            const member = interaction.options.getMember("user");
            const duration = interaction.options.getInteger("duration");
            await member.timeout(duration * 60000);
            return interaction.reply(`Timeout ${duration} min ✅`);
        }

        // ===== MUTE =====
        if (interaction.commandName === "mute") {
            const member = interaction.options.getMember("user");
            await member.timeout(10 * 60000);
            return interaction.reply("Muted 10 min ✅");
        }
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

        // ===== CREATE TICKET =====
        if (["support", "account", "nitro", "replace", "boost"].includes(interaction.customId)) {

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: `<@${interaction.user.id}> | <@&${STAFF_ROLE_ID}>`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Ticket Opened")
                        .setDescription("Staff will assist you shortly.")
                        .setColor(0x00ff99)
                ],
                components: [closeButton]
            });

            return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
        }

        // ===== CLOSE TICKET =====
        if (interaction.customId === "close_ticket") {
            if (
                interaction.member.roles.cache.has(STAFF_ROLE_ID) ||
                interaction.channel.name.includes(interaction.user.username)
            ) {
                await interaction.reply("Closing ticket...");
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 2000);
            } else {
                interaction.reply({ content: "You can't close this ticket", ephemeral: true });
            }
        }
    }
});

// ================= ANTI LINK + SPAM =================
const spamMap = new Map();

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    // Anti Link
    if (message.content.match(/https?:\/\/\S+/) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await message.delete().catch(() => {});
        message.channel.send("Links not allowed ❌");
    }

    // Anti Spam
    if (!spamMap.has(message.author.id)) {
        spamMap.set(message.author.id, { count: 1 });
        setTimeout(() => spamMap.delete(message.author.id), 5000);
    } else {
        const data = spamMap.get(message.author.id);
        data.count++;
        if (data.count >= 6) {
            await message.member.timeout(5 * 60000).catch(() => {});
            spamMap.delete(message.author.id);
        }
    }
});

// ================= KEEP ALIVE =================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
