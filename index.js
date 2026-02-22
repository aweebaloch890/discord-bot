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
const OPEN_CATEGORY_ID = "1337265672597672079";
const CLOSED_CATEGORY_ID = "1407037252609118328";

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

// ================= DATA =================
let ticketData = fs.existsSync("./tickets.json")
    ? JSON.parse(fs.readFileSync("./tickets.json"))
    : { count: 0 };

let vouchData = fs.existsSync("./vouches.json")
    ? JSON.parse(fs.readFileSync("./vouches.json"))
    : { users: {} };

// ================= READY =================
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await client.application.commands.set([
        { name: "ticketpanel", description: "Send ticket panel" },
        {
            name: "vouch",
            description: "Give vouch",
            options: [
                { name: "user", description: "Select user", type: 6, required: true },
                { name: "product", description: "Product Name", type: 3, required: true },
                { name: "price", description: "Price", type: 3, required: true },
                { name: "rating", description: "Rating (1-5)", type: 4, required: true },
                { name: "reason", description: "Reason", type: 3, required: true }
            ]
        }
    ]);

    console.log("Slash Commands Registered ✅");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

    // ===== SLASH =====
    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === "ticketpanel") {
            if (interaction.channelId !== PANEL_CHANNEL_ID)
                return interaction.reply({ content: "Wrong channel ❌", ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("🎟 TEC TRADER Support")
                .setColor(0x2b2d31)
                .setDescription("Select ticket type below");

            const select = new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("Select ticket type")
                .addOptions(
                    { label: "Purchase", value: "purchase", emoji: "🛒" },
                    { label: "Replacement", value: "replace", emoji: "🔁" },
                    { label: "Not Received", value: "notreceived", emoji: "❌" },
                    { label: "Other", value: "other", emoji: "🌐" }
                );

            return interaction.reply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(select)]
            });
        }

        // ===== VOUCH =====
        if (interaction.commandName === "vouch") {

            const user = interaction.options.getUser("user");
            const product = interaction.options.getString("product");
            const price = interaction.options.getString("price");
            const rating = interaction.options.getInteger("rating");
            const reason = interaction.options.getString("reason");

            const stars = "⭐".repeat(Math.min(rating, 5));

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle("📝 New Vouch Recorded!")
                .addFields(
                    { name: "🛍 Product", value: product },
                    { name: "💰 Price", value: price },
                    { name: "👤 Seller", value: `<@${user.id}>` },
                    { name: "⭐ Rating", value: `${stars} (${rating}/5)` },
                    { name: "📌 Reason", value: reason }
                );

            return interaction.reply({ embeds: [embed] });
        }
    }

    // ===== SELECT MENU =====
    if (interaction.isStringSelectMenu()) {

        // 🛒 PURCHASE
        if (interaction.values[0] === "purchase") {

            const modal = new ModalBuilder()
                .setCustomId("modal_purchase")
                .setTitle("🛒 Purchase Form");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("product")
                        .setLabel("Product Name")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("payment")
                        .setLabel("Payment Method (JazzCash/Easypaisa/Bank/Crypto)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("details")
                        .setLabel("Extra Details")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                )
            );

            return interaction.showModal(modal);
        }

        // 🔁 REPLACEMENT
        if (interaction.values[0] === "replace") {

            const modal = new ModalBuilder()
                .setCustomId("modal_replace")
                .setTitle("🔁 Replacement Form");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("product")
                        .setLabel("Product Name")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("orderid")
                        .setLabel("Order ID")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("transaction")
                        .setLabel("Transaction ID")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("problem")
                        .setLabel("Problem Description + Screenshot Link")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        // ❌ NOT RECEIVED
        if (interaction.values[0] === "notreceived") {

            const modal = new ModalBuilder()
                .setCustomId("modal_notreceived")
                .setTitle("❌ Not Received Form");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("product")
                        .setLabel("Product Name")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("payment")
                        .setLabel("Payment Method")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("transaction")
                        .setLabel("Transaction ID")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("proof")
                        .setLabel("Proof Screenshot Link")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        // 🌐 OTHER
        if (interaction.values[0] === "other") {

            const modal = new ModalBuilder()
                .setCustomId("modal_other")
                .setTitle("🌐 Other Support");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("help")
                        .setLabel("How can I help you?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {

        ticketData.count++;
        fs.writeFileSync("./tickets.json", JSON.stringify(ticketData));

        const number = String(ticketData.count).padStart(2, "0");

        const channel = await interaction.guild.channels.create({
            name: `ticket-${number}`,
            type: ChannelType.GuildText,
            parent: OPEN_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("close").setLabel("🔒 Close").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("claim").setLabel("👮 Claim").setStyle(ButtonStyle.Primary)
        );

        const data = interaction.fields.fields.map(f => `**${f.customId.toUpperCase()}**: ${f.value}`).join("\n");

        await channel.send({
            content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
            embeds: [new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle(`Ticket #${number}`)
                .setDescription(data)
            ],
            components: [buttons]
        });

        return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }

});

// ================= KEEP ALIVE =================
http.createServer((req, res) => {
    res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
