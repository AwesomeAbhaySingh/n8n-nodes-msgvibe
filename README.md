# n8n-nodes-msgvibe

An [n8n](https://n8n.io) community node for [MsgVibe](https://www.msgvibe.com), the video maker that turns your brand, products and customer data into personalized marketing videos with trackable pages.

Use it to make a branded video for every lead, order or booking, and to start a workflow when a video is ready, watched or clicked.

- [Installation](#installation)
- [Credentials](#credentials)
- [Nodes](#nodes)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install the package `n8n-nodes-msgvibe`.

## Credentials

1. Sign in at [msgvibe.com](https://www.msgvibe.com) (free to start).
2. Open **Dashboard → API keys** and create a key. It starts with `mvk_live_` and is shown once.
3. In n8n, create a **MsgVibe API** credential and paste the key.

n8n tests the key against `GET /v1/account` when you save it.

## Nodes

### MsgVibe

| Operation | What it does |
| --- | --- |
| **Video → Create** | Makes a branded video for one person or product. Uses 1 credit; a failed video is refunded. |
| **Video → Get** | Returns the status, MP4 link and page link of one video. |
| **Video → Get Many** | Lists your videos, newest first, optionally by status. |

Fields of **Create**:

| Field | Notes |
| --- | --- |
| Design | One of your MsgVibe designs, loaded from your account. |
| Brand Kit | Logo, colours and contact details. Optional if the design has its own. |
| First Line | The headline, e.g. `Hi {{ $json.first_name }}!` (up to 40 characters). |
| Second Line, Offer Line | Optional text lines. |
| Button Text, Button Link | The call to action on the video page. |
| Product Name, Product Photo URL, Price, Sale Price, Currency | Optional. The product is shown when a photo URL is set. |
| Recipient Name, Email, Phone | Who the video is for. Returned with the Video Ready event. |
| Tracked Page | On by default: the video gets its own page that counts views and clicks. |
| QR Code at the End | Adds a QR code to the button link on the last scene. |
| Size | 9:16, 4:5, 1:1 or 16:9. |
| Reference | Your own ID (order or lead number), returned as `externalId`. |

Create returns at once with the video `id` and the status `queued`. Rendering takes about a minute. Use the trigger below to continue when the video is ready.

### MsgVibe Trigger

Starts a workflow on one of these events. The node registers and removes its own webhook in MsgVibe when you activate or deactivate the workflow.

| Event | When |
| --- | --- |
| **Video Ready** | A video has finished rendering. Output includes `outputUrl`, `shareUrl` and `metadata` (recipient name and email). |
| **Video Viewed** | Someone opened a video page for the first time. |
| **Video Button Clicked** | Someone clicked the button on a video page for the first time. |
| **Video Failed** | A video could not be made. The credit is already refunded. |
| **Batch Finished** | Every video of a batch is done, failed or cancelled. |

MsgVibe only calls public `https` addresses, so the trigger needs an n8n instance that is reachable from the internet (n8n Cloud, or self-hosted with a public URL or tunnel).

## Example workflows

**Thank-you video for every Shopify order**

1. Shopify Trigger (order paid) → **MsgVibe: Create** with First Line `Thank you, {{ $json.customer.first_name }}!`, Recipient Email `{{ $json.customer.email }}` and Reference `{{ $json.name }}`.
2. In a second workflow: **MsgVibe Trigger: Video Ready** → Gmail: send `{{ $json.shareUrl }}` to `{{ $json.metadata.email }}`.

**Tell sales when a lead watches**

**MsgVibe Trigger: Video Viewed** → Slack: post `{{ $json.recipient.name }} watched their video: {{ $json.sharePageUrl }}`.

## Compatibility

Built and linted with `@n8n/node-cli` against n8n-workflow 2.x. It has no runtime dependencies.

## Resources

- [MsgVibe + n8n guide](https://www.msgvibe.com/integrations/n8n)
- [MsgVibe API reference](https://www.msgvibe.com/developers)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
