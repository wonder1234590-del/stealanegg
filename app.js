/* =========================================
   TELEGRAM
========================================= */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.setHeaderColor("#0c0f15");
        tg.setBackgroundColor("#080a0f");
    } catch (e) {}
}


/* =========================================
   STATE
========================================= */

const state = {

    page: "market",

    game: "All",

    search: "",

    listings: [],

    orders: [],

    user: null,

    selectedGame: "Roblox"

};


/* =========================================
   DOM
========================================= */

const app = document.getElementById("app");

const balanceElement =
    document.getElementById("balance");


/* =========================================
   API
========================================= */

async function api(url, options = {}) {

    const headers = {
        "Content-Type": "application/json"
    };

    if (tg?.initData) {
        headers["X-Telegram-Init-Data"] = tg.initData;
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });

    let data = {};

    try {
        data = await response.json();
    } catch (e) {}

    if (!response.ok) {

        throw new Error(
            data.error || "Произошла ошибка"
        );
    }

    return data;
}


/* =========================================
   HELPERS
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function stars(amount) {

    return `${Number(amount || 0)} ⭐`;
}


function showToast(message) {

    const container =
        document.getElementById("toast-container");

    const element =
        document.createElement("div");

    element.className = "toast";

    element.textContent = message;

    container.appendChild(element);

    setTimeout(() => {
        element.remove();
    }, 3000);
}


/* =========================================
   USER
========================================= */

async function loadUser() {

    try {

        const data =
            await api("/api/me");

        state.user = data.user;

        balanceElement.textContent =
            state.user.balance;

    } catch (error) {

        /*
         Пока backend ещё не подключён,
         интерфейс всё равно будет открываться.
        */

        state.user = null;

        balanceElement.textContent = "0";
    }
}


/* =========================================
   NAVIGATION
========================================= */

async function navigate(page) {

    state.page = page;

    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });

    await render();
}


/* =========================================
   RENDER
========================================= */

async function render() {

    if (state.page === "market") {

        await renderMarket();

        return;
    }

    if (state.page === "sell") {

        renderSell();

        return;
    }

    if (state.page === "chat") {

        await renderChats();

        return;
    }

    if (state.page === "profile") {

        await renderProfile();

        return;
    }
}


/* =========================================
   MARKET
========================================= */

async function renderMarket() {

    try {

        const game =
            state.game === "All"
                ? ""
                : state.game;

        state.listings =
            await api(
                `/api/listings?game=${encodeURIComponent(game)}&q=${encodeURIComponent(state.search)}`
            );

    } catch (error) {

        state.listings = [];
    }


    app.innerHTML = `

        <div class="page-title">
            Marketplace
        </div>

        <div class="page-subtitle">
            Roblox и Standoff 2
        </div>


        <input
            id="market-search"
            class="search-box"
            type="text"
            placeholder="🔎 Поиск товара..."
            value="${escapeHtml(state.search)}"
        >


        <div class="filters">

            ${createFilter("All", "Все")}

            ${createFilter("Roblox", "Roblox")}

            ${createFilter("Standoff 2", "Standoff 2")}

        </div>


        <div id="products">

            ${
                state.listings.length
                    ? state.listings
                        .map(createProductCard)
                        .join("")
                    : `
                        <div class="empty">

                            <div class="empty-icon">
                                🛒
                            </div>

                            <div class="empty-title">
                                Товаров пока нет
                            </div>

                            <p>
                                Здесь появятся товары продавцов.
                            </p>

                        </div>
                    `
            }

        </div>

    `;


    const search =
        document.getElementById("market-search");


    search.addEventListener(
        "input",
        event => {

            state.search =
                event.target.value;

            clearTimeout(window.searchTimer);

            window.searchTimer =
                setTimeout(
                    renderMarket,
                    350
                );

        }
    );


    document
        .querySelectorAll("[data-game-filter]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    state.game =
                        button.dataset.gameFilter;

                    renderMarket();

                }
            );

        });
}


function createFilter(value, title) {

    return `

        <button
            class="filter-button ${
                state.game === value
                    ? "active"
                    : ""
            }"
            data-game-filter="${value}"
        >
            ${title}
        </button>

    `;
}


function createProductCard(item) {

    return `

        <div class="card">

            <div class="card-row">

                <div class="product-game">
                    ${escapeHtml(item.game)}
                </div>

                <div class="product-price">
                    ${stars(item.price)}
                </div>

            </div>


            <h3 class="card-title">
                ${escapeHtml(item.title)}
            </h3>


            ${
                item.info
                    ? `
                        <div class="card-text">
                            ${escapeHtml(item.info)}
                        </div>
                    `
                    : ""
            }


            ${
                item.description
                    ? `
                        <div class="product-description">
                            ${escapeHtml(item.description)}
                        </div>
                    `
                    : ""
            }


            <div class="product-seller">

                👤 @${escapeHtml(
                    item.seller_username || "seller"
                )}

                <br>

                📅 ${escapeHtml(item.created_at)}

            </div>


            <button
                class="primary-button"
                onclick="buyProduct(${item.id})"
            >
                Купить за ${stars(item.price)}
            </button>

        </div>

    `;
}


/* =========================================
   BUY
========================================= */

async function buyProduct(listingId) {

    const product =
        state.listings.find(
            item => item.id === listingId
        );

    if (!product) {

        showToast("Товар больше недоступен");

        return;
    }


    const confirmed =
        confirm(
            `Купить "${product.title}" за ${product.price} ⭐?`
        );


    if (!confirmed) return;


    try {

        const result =
            await api(
                "/api/orders",
                {
                    method: "POST",

                    body: JSON.stringify({
                        listingId
                    })
                }
            );


        showToast(
            `Заказ #${result.orderId} создан`
        );


        await loadUser();

        await navigate("chat");


    } catch (error) {

        showToast(error.message);

    }
}


/* =========================================
   SELL
========================================= */

function renderSell() {

    app.innerHTML = `

        <div class="page-title">
            Продать товар
        </div>

        <div class="page-subtitle">
            Разместите свой игровой предмет
        </div>


        <div class="card">

            <label>
                Название товара
            </label>

            <input
                id="sell-title"
                class="input"
                placeholder="Например: редкий предмет"
            >


            <label>
                Игра
            </label>


            <div class="game-selector">

                <button
                    id="game-roblox"
                    class="game-button ${
                        state.selectedGame === "Roblox"
                            ? "active"
                            : ""
                    }"
                    onclick="selectSellGame('Roblox')"
                >
                    Roblox
                </button>


                <button
                    id="game-standoff"
                    class="game-button ${
                        state.selectedGame === "Standoff 2"
                            ? "active"
                            : ""
                    }"
                    onclick="selectSellGame('Standoff 2')"
                >
                    Standoff 2
                </button>

            </div>


            <input
                id="sell-tag"
                class="input"
                placeholder="Gamer Tag / ID"
            >


            <input
                id="sell-info"
                class="input"
                placeholder="Краткая информация"
            >


            <textarea
                id="sell-description"
                class="textarea"
                placeholder="Подробное описание товара"
            ></textarea>


            <input
                id="sell-image"
                class="input"
                placeholder="Ссылка на изображение"
            >


            <input
                id="sell-price"
                class="input"
                type="number"
                min="1"
                placeholder="Цена в Stars"
            >


            <button
                class="primary-button"
                onclick="publishListing()"
            >
                Опубликовать товар
            </button>

        </div>

    `;
}


function selectSellGame(game) {

    state.selectedGame = game;

    renderSell();
}


async function publishListing() {

    const title =
        document.getElementById("sell-title")
            .value
            .trim();

    const tag =
        document.getElementById("sell-tag")
            .value
            .trim();

    const info =
        document.getElementById("sell-info")
            .value
            .trim();

    const description =
        document.getElementById("sell-description")
            .value
            .trim();

    const image =
        document.getElementById("sell-image")
            .value
            .trim();

    const price =
        Number(
            document.getElementById("sell-price")
                .value
        );


    if (!title) {

        showToast("Введите название товара");

        return;
    }


    if (!Number.isInteger(price) || price <= 0) {

        showToast("Введите правильную цену");

        return;
    }


    try {

        await api(
            "/api/listings",
            {
                method: "POST",

                body: JSON.stringify({

                    game:
                        state.selectedGame,

                    title,

                    gamer_tag:
                        tag,

                    info,

                    description,

                    image,

                    price

                })
            }
        );


        showToast(
            "Товар опубликован"
        );


        await navigate("market");


    } catch (error) {

        showToast(error.message);

    }
}


/* =========================================
   CHATS / ORDERS
========================================= */

async function renderChats() {

    try {

        state.orders =
            await api("/api/orders");

    } catch (error) {

        state.orders = [];

    }


    app.innerHTML = `

        <div class="page-title">
            Чаты
        </div>

        <div class="page-subtitle">
            Ваши покупки и продажи
        </div>


        ${
            state.orders.length
                ? state.orders
                    .map(createOrderCard)
                    .join("")
                : `
                    <div class="empty">

                        <div class="empty-icon">
                            💬
                        </div>

                        <div class="empty-title">
                            Заказов пока нет
                        </div>

                        <p>
                            Здесь появятся ваши сделки.
                        </p>

                    </div>
                `
        }

    `;
}


function createOrderCard(order) {

    let statusClass = "";

    if (order.status === "completed") {

        statusClass = "completed";

    } else if (order.status === "dispute") {

        statusClass = "dispute";

    } else {

        statusClass = "waiting";

    }


    return `

        <div class="card">

            <div class="card-row">

                <h3 class="card-title">
                    #${order.id}
                    ${escapeHtml(order.title)}
                </h3>

                <div class="product-price">
                    ${stars(order.price)}
                </div>

            </div>


            <div class="card-text">

                ${escapeHtml(order.game)}

            </div>


            <div class="status ${statusClass}">

                ${getStatusText(order.status)}

            </div>


            <button
                class="primary-button"
                onclick="openOrder(${order.id})"
            >
                Открыть заказ
            </button>

        </div>

    `;
}


function getStatusText(status) {

    const statuses = {

        waiting_seller:
            "Ожидает продавца",

        completed:
            "Завершён",

        dispute:
            "Спор",

        cancelled:
            "Отменён"

    };

    return statuses[status] || status;
}


/* =========================================
   ORDER
========================================= */

async function openOrder(orderId) {

    const order =
        state.orders.find(
            item => item.id === orderId
        );


    if (!order) return;


    let messages = [];

    try {

        messages =
            await api(
                `/api/orders/${orderId}/messages`
            );

    } catch (error) {}


    const isBuyer =
        state.user &&
        order.buyer_id === state.user.id;


    app.innerHTML = `

        <div class="page-title">
            Заказ #${order.id}
        </div>


        <div class="card">

            <h3 class="card-title">
                ${escapeHtml(order.title)}
            </h3>


            <div class="card-text">

                Игра:
                <b>${escapeHtml(order.game)}</b>

                <br><br>

                Цена:
                <b>${stars(order.price)}</b>

            </div>


            <div class="status ${
                order.status === "completed"
                    ? "completed"
                    : order.status === "dispute"
                        ? "dispute"
                        : "waiting"
            }">

                ${getStatusText(order.status)}

            </div>

        </div>


        <div class="card">

            <h3 class="card-title">
                💬 Чат заказа
            </h3>


            <div id="messages">

                ${
                    messages.length
                        ? messages
                            .map(message =>
                                createMessage(
                                    message,
                                    state.user?.id
                                )
                            )
                            .join("")
                        : `
                            <div class="card-text">
                                Сообщений пока нет.
                            </div>
                        `
                }

            </div>


            ${
                order.status !== "completed"
                    ? `
                        <textarea
                            id="message-input"
                            class="textarea"
                            placeholder="Напишите сообщение..."
                        ></textarea>

                        <button
                            class="primary-button"
                            onclick="sendMessage(${order.id})"
                        >
                            Отправить
                        </button>
                    `
                    : ""
            }

        </div>


        ${
            isBuyer &&
            order.status !== "completed"
                ? `
                    <div class="card">

                        <button
                            class="primary-button"
                            onclick="confirmReceived(${order.id})"
                        >
                            ✓ Я получил товар
                        </button>


                        <button
                            class="danger-button"
                            onclick="openDispute(${order.id})"
                        >
                            ⚠ Проблема / Dispute
                        </button>

                    </div>
                `
                : ""
        }

    `;
}


function createMessage(message, myId) {

    const mine =
        Number(message.sender_id) ===
        Number(myId);


    return `

        <div class="message ${mine ? "mine" : ""}">

            <div class="message-author">

                ${mine ? "Вы" : "Пользователь"}

            </div>

            <div class="message-text">

                ${escapeHtml(message.text)}

            </div>

        </div>

    `;
}


async function sendMessage(orderId) {

    const input =
        document.getElementById(
            "message-input"
        );


    const text =
        input.value.trim();


    if (!text) return;


    try {

        await api(
            `/api/orders/${orderId}/messages`,
            {
                method: "POST",

                body: JSON.stringify({
                    text
                })
            }
        );


        await renderChats();

        await openOrder(orderId);


    } catch (error) {

        showToast(error.message);

    }
}


/* =========================================
   RECEIVED
========================================= */

async function confirmReceived(orderId) {

    const confirmed =
        confirm(
            "Подтвердить, что вы получили товар?"
        );


    if (!confirmed) return;


    try {

        await api(
            `/api/orders/${orderId}/received`,
            {
                method: "POST"
            }
        );


        showToast(
            "Получение подтверждено"
        );


        await renderChats();


    } catch (error) {

        showToast(error.message);

    }
}


/* =========================================
   DISPUTE
========================================= */

async function openDispute(orderId) {

    const confirmed =
        confirm(
            "Открыть спор по этому заказу?"
        );


    if (!confirmed) return;


    try {

        await api(
            `/api/orders/${orderId}/dispute`,
            {
                method: "POST"
            }
        );


        showToast(
            "Спор открыт"
        );


        await renderChats();


    } catch (error) {

        showToast(error.message);

    }
}


/* =========================================
   PROFILE
========================================= */

async function renderProfile() {

    await loadUser();


    if (!state.user) {

        app.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    👤
                </div>

                <div class="empty-title">
                    Откройте приложение через Telegram
                </div>

            </div>

        `;

        return;
    }


    app.innerHTML = `

        <div class="page-title">
            Профиль
        </div>


        <div class="card">

            <div class="profile-avatar">
                👤
            </div>


            <div class="profile-name">

                @${escapeHtml(
                    state.user.username ||
                    state.user.first_name ||
                    "user"
                )}

            </div>


            <div class="profile-id">

                Telegram ID:
                ${state.user.id}

            </div>


            <div class="stats">

                <div class="stat">

                    <div class="stat-number">
                        ${state.user.balance}
                    </div>

                    <div class="stat-label">
                        Stars
                    </div>

                </div>


                <div class="stat">

                    <div class="stat-number">
                        ${state.user.purchases || 0}
                    </div>

                    <div class="stat-label">
                        Покупки
                    </div>

                </div>


                <div class="stat">

                    <div class="stat-number">
                        ${state.user.sales || 0}
                    </div>

                    <div class="stat-label">
                        Продажи
                    </div>

                </div>

            </div>


            <button
                class="primary-button"
                onclick="openTopUp()"
            >
                ⭐ Пополнить баланс
            </button>

        </div>


        <div class="card">

            <h3 class="card-title">
                Поддержка
            </h3>

            <div class="card-text">
                Если возникла проблема с заказом,
                создайте обращение.
            </div>


            <button
                class="secondary-button"
                onclick="openSupport()"
            >
                Открыть поддержку
            </button>

        </div>

    `;
}


/* =========================================
   TOP UP
========================================= */

async function openTopUp() {

    const amount =
        prompt(
            "Сколько Telegram Stars добавить?\n\nНапример: 100"
        );


    if (amount === null) return;


    const starsAmount =
        Number(amount);


    if (
        !Number.isInteger(starsAmount) ||
        starsAmount <= 0
    ) {

        showToast(
            "Введите целое число Stars"
        );

        return;
    }


    try {

        const data =
            await api(
                "/api/topup/invoice",
                {
                    method: "POST",

                    body: JSON.stringify({
                        stars: starsAmount
                    })
                }
            );


        /*
         * Здесь откроется настоящий
         * Telegram invoice.
         */

        if (tg?.openInvoice) {

            tg.openInvoice(
                data.url,
                async status => {

                    if (
                        status === "paid"
                    ) {

                        showToast(
                            "Оплата получена"
                        );

                        await loadUser();

                    }

                }
            );

        } else {

            window.open(
                data.url,
                "_blank"
            );

        }


    } catch (error) {

        showToast(
            error.message
        );

    }
}


/* =========================================
   SUPPORT
========================================= */

async function openSupport() {

    const subject =
        prompt(
            "Тема обращения"
        );


    if (!subject) return;


    const text =
        prompt(
            "Опишите проблему"
        );


    if (!text) return;


    try {

        await api(
            "/api/tickets",
            {
                method: "POST",

                body: JSON.stringify({
                    subject,
                    text
                })
            }
        );


        showToast(
            "Обращение отправлено"
        );


    } catch (error) {

        showToast(
            error.message
        );

    }
}


/* =========================================
   START
========================================= */

async function start() {

    await loadUser();

    await render();

}


start();
