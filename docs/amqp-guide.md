# AMQP (RabbitMQ) — User Guide

Bruno supports **AMQP 0-9-1** requests, letting you connect to a RabbitMQ (or any AMQP 0-9-1 compatible) broker directly from the app. You can **publish** messages, **consume** messages in real-time, and see a bidirectional message log — all without leaving Bruno.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Creating an AMQP Request](#creating-an-amqp-request)
3. [Interface Overview](#interface-overview)
4. [Connecting to a Broker](#connecting-to-a-broker)
5. [Publishing Messages (PUB)](#publishing-messages-pub)
6. [Consuming Messages (SUB)](#consuming-messages-sub)
7. [Message Log](#message-log)
8. [Settings](#settings)
9. [Using Variables](#using-variables)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

```
1. New Request → select "amqp" type
2. Enter URL:        amqp://localhost:5672
3. Message tab → Publish sub-tab: set Routing Key = "my-queue", write a body
4. Click the Send button to publish (auto-connects if needed)
5. Message tab → Consume sub-tab: set Queue = "my-queue"
6. Right panel → click "Start Consuming" to receive messages
```

---

## Creating an AMQP Request

1. Right-click on a collection (or use the `+` button) → **New Request**
2. In the dialog, select the **`amqp`** protocol radio button
3. Give the request a name (e.g., "RabbitMQ Test")
4. Click **Create**

The request will appear in the sidebar with an `AMQP` method badge.

---

## Interface Overview

An AMQP request has **two panels**, just like HTTP or WebSocket requests:

### Left Panel — Request Configuration

The URL bar at the top and the tabs below it:

| Tab | Purpose |
|---|---|
| **Message** | Two sub-tabs: **Publish** (exchange, routing key, exchange type, and the message body) and **Consume** (queue, exchange, exchange type, binding routing key) |
| **Auth** | Authentication for the connection. Supports **No Auth**, **Basic Auth**, and **Inherit** (from collection/folder) |
| **Headers** | Add custom AMQP headers/properties to your messages |
| **Settings** | Timeout, heartbeat, prefetch count, virtual host |
| **Docs** | Free-form documentation for this request |

### Message Tab — Publish / Consume Sub-tabs

- **Publish** holds everything used when you click **Send**: the target exchange, exchange type, routing key, and the message body editor.
- **Consume** holds an independent configuration used by **Start Consuming**: the queue to subscribe to, plus an optional exchange + binding routing key to bind the queue before consuming.

### Right Panel — Response / Message Log

This is where the **Consume** controls live, along with the live message log.

**Buttons at the top of the right panel:**

| Button | What it does |
|---|---|
| **Start Consuming** (green) | Subscribes to the configured queue (Consume sub-tab) — incoming messages appear in the log in real-time |
| **Stop Consuming** (red) | Unsubscribes from the queue (replaces "Start Consuming" while active) |
| **Clear** | Clears the message log |

> **Publishing** is triggered by the **Send** button next to the URL bar (left panel), not from the right panel. The right panel hosts only the consumer controls and the message log.

---

## Connecting to a Broker

Before you can publish or consume, you must establish a connection to the AMQP broker.

### URL Format

```
amqp://[username:password@]host[:port][/vhost]
```

**Examples:**
| URL | Description |
|---|---|
| `amqp://localhost:5672` | Local RabbitMQ, default credentials (guest/guest) |
| `amqp://user:pass@rabbit.example.com:5672` | Remote broker with credentials |
| `amqp://admin:secret@localhost:5672/my-vhost` | Custom virtual host |

### How to Connect

1. Enter the broker URL in the URL bar
2. Click the **green plug icon** (🔌) at the right end of the URL bar
3. Wait for the **"AMQP connected"** toast notification
4. A green strip appears below the URL bar indicating an active connection

### How to Disconnect

- Click the **red plug icon** (🔌✕) that replaces the green one while connected
- A **"AMQP disconnected"** toast confirms the disconnection

### Connection Indicators

| State | Visual |
|---|---|
| Disconnected | Green plug icon (click to connect) |
| Connecting | Pulsing/animated green plug icon |
| Connected | Red plug icon (click to disconnect) + green strip below URL bar |

---

## Publishing Messages (PUB)

Publishing sends a message to the broker. Messages are routed via an exchange + routing key, or directly to a queue.

### Setup (Message Tab → Publish Sub-tab)

| Field | Required | Description |
|---|---|---|
| **Exchange** | No | The exchange to publish to. Leave empty to use the default exchange (`""`) |
| **Exchange Type** | No | `direct`, `topic`, `fanout`, or `headers`. Only relevant if declaring an exchange |
| **Routing Key** | Yes* | The routing key for the message. *If using the default exchange, this must be the queue name |
| **Message Body** | Yes | JSON editor for the message payload |

### How to Publish

1. Open the **Message** tab and select the **Publish** sub-tab
2. Fill in the routing key (and optionally the exchange + exchange type)
3. Write your message body (JSON) in the editor:
   ```json
   {
     "hello": "world",
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```
4. Click the **Send** button next to the URL bar. Bruno auto-connects if not already connected.
5. The message appears in the right-panel log as **→ SENT** (blue background)

### Default Exchange Shortcut

If you leave **Exchange** empty:
- The message is published to RabbitMQ's **default exchange** (`""`)
- The **Routing Key** is used as the queue name
- The message goes directly to that queue (no exchange routing needed)

This is the simplest setup for getting started:
```
Exchange:    (leave empty)
Routing Key: my-queue
Queue:       my-queue
```

---

## Consuming Messages (SUB)

Consuming subscribes to a queue and shows incoming messages in real-time.

### How to Start Consuming

1. Open the **Message** tab and select the **Consume** sub-tab
2. Set the **Queue** name (and optionally an exchange + binding routing key)
3. Go to the **right panel** and click the green **"Start Consuming"** button (auto-connects if needed)
4. A **"Started consuming"** toast confirms the subscription

> The "Start Consuming" button is disabled (grayed out) if no queue name is set.

### How to Stop Consuming

- Click the red **"Stop Consuming"** button (it replaces "Start Consuming" while active)
- A **"Stopped consuming"** toast confirms

### How Consuming Works

- Bruno creates a consumer on the specified queue
- Any message arriving in that queue appears immediately in the message log as **← RECV** (green background)
- This includes messages you publish yourself (if routing key matches the queue), giving you a full round-trip view
- Consuming continues until you explicitly stop it or disconnect

---

## Message Log

The message log (right panel) shows all published and received messages in chronological order.

### Message Format

Each message entry shows:

```
← RECV  key=my-queue           14:30:25
{"hello": "world"}

→ SENT  key=my-queue           14:30:20
{"hello": "world"}
```

| Element | Meaning |
|---|---|
| `← RECV` (green) | Incoming message (consumed from queue) |
| `→ SENT` (blue) | Outgoing message (published by you) |
| `key=...` | The routing key of the message |
| Timestamp | When the message was sent/received |
| Body | The message content (pretty-printed) |

### Clearing the Log

Click the **"Clear"** button to remove all messages from the log. The message counter resets to 0.

---

## Settings

Access via the **Settings** tab in the left panel.

| Setting | Default | Description |
|---|---|---|
| **Timeout (ms)** | `5000` | Connection timeout in milliseconds |
| **Heartbeat (seconds)** | `0` | AMQP heartbeat interval. `0` = use server default |
| **Prefetch Count** | `0` | How many messages to prefetch when consuming. `0` = no limit |
| **Virtual Host** | `/` | The AMQP virtual host to connect to |

---

## Using Variables

AMQP requests support Bruno's **variable interpolation** in all fields using `{{variable_name}}` syntax.

### Supported Fields

- URL: `amqp://{{RABBIT_HOST}}:{{RABBIT_PORT}}`
- Exchange: `{{EXCHANGE_NAME}}`
- Routing Key: `{{ROUTING_KEY}}`
- Queue: `{{QUEUE_NAME}}`

### Variable Sources

Variables are resolved from (in order of precedence):
1. **Runtime variables** — set via scripts during execution
2. **Environment variables** — from the active Bruno environment
3. **Collection variables** — defined at the collection level
4. **Process environment variables** — from `process.env`

### Example

With an environment that defines:
```
RABBIT_URL = amqp://prod-rabbit.example.com:5672
ORDER_QUEUE = orders.incoming
```

You can configure:
```
URL:         {{RABBIT_URL}}
Queue:       {{ORDER_QUEUE}}
Routing Key: {{ORDER_QUEUE}}
```

---

## Common Patterns

### Pattern 1: Simple Queue (Point-to-Point)

The simplest pattern — publish directly to a queue and consume from it.

```
Exchange:    (empty)
Routing Key: task-queue
Queue:       task-queue
```

1. Connect → Start Consuming → Publish
2. You'll see both `→ SENT` and `← RECV` for each message (round-trip)

### Pattern 2: Fanout Exchange (Broadcast)

Publish once, deliver to all bound queues.

```
Exchange:      notifications
Exchange Type: fanout
Routing Key:   (ignored for fanout)
Queue:         my-listener-queue
```

### Pattern 3: Topic Exchange (Pattern Routing)

Route messages based on routing key patterns.

```
Exchange:      events
Exchange Type: topic
Routing Key:   order.created
Queue:         order-events
```

Consumers can bind with patterns like `order.*` or `#.created`.

### Pattern 4: Work Queue (Load Balancing)

Multiple Bruno instances consuming from the same queue — each message goes to one consumer only.

```
Exchange:      (empty)
Routing Key:   work-queue
Queue:         work-queue
Prefetch:      1          (in Settings)
```

---

## Troubleshooting

### "Start Consuming" button is disabled
→ You need to set a **Queue** name in the Message tab → **Consume** sub-tab first.

### "AMQP connection failed" error
→ Check that:
- The broker is running and reachable at the specified URL
- The port is correct (default: `5672` for AMQP, NOT `15672` which is the management UI)
- Credentials are correct (RabbitMQ default: `guest`/`guest`, only works from localhost)

### Messages published but not received
→ Make sure:
- You clicked **"Start Consuming"** before publishing (or the queue already existed with a binding)
- The routing key matches the queue name (when using the default exchange)
- The exchange type and routing key pattern match if using a named exchange

### "Publish failed" error
→ Clicking **Send** auto-connects first. If it still fails, check the broker URL and credentials, and confirm the exchange/routing key are valid.

### Connection drops unexpectedly
→ Check the **Heartbeat** setting. If set too low, the connection may time out during idle periods. Set to `0` to use the server default, or increase to `30`-`60` seconds.

### Variables not resolving
→ Make sure you have an active environment selected in your collection, and that the variable names match exactly (case-sensitive).

---

## `.bru` File Format

AMQP requests are saved as `.bru` files with the following structure:

```bru
meta {
  name: My AMQP Request
  type: amqp-request
  seq: 1
}

amqp {
  url: amqp://localhost:5672
  auth: none
  publish {
    exchange:
    exchangeType: direct
    routingKey: my-queue
  }
  consume {
    exchange:
    exchangeType: direct
    routingKey:
    queue: my-queue
  }
}

body:amqp {
  {
    "hello": "world"
  }
}
```

You can edit these files directly in a text editor if preferred.
