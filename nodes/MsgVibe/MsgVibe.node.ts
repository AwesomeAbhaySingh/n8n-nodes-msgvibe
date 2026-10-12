import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { msgVibeApiRequest } from './transport';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** The request body for POST /videos, built from the node's fields. Empty fields are left out. */
function videoBody(
	design: string,
	brandKit: string,
	headline: string,
	extra: IDataObject,
): IDataObject {
	const button = text(extra.buttonText) || 'Learn more';
	const link = text(extra.buttonLink);
	const body: IDataObject = {
		templateUniqueId: design,
		aspectRatio: extra.size || '9:16',
		currency: extra.currency || 'USD',
		promotion: {
			title: headline,
			subtitle: text(extra.subtitle),
			offerText: text(extra.offer),
			cta: button,
		},
	};
	if (brandKit) body.brandKitId = brandKit;

	const productImage = text(extra.productImage);
	if (productImage) {
		const product: IDataObject = { name: text(extra.productName) || headline, image: productImage };
		if (extra.price) product.price = Number(extra.price);
		if (extra.salePrice) product.salePrice = Number(extra.salePrice);
		body.products = [product];
	}

	if (extra.qrCode === true && link) body.qr = { url: link, label: 'Scan me' };

	const reference = text(extra.reference);
	if (reference) body.externalId = reference.replace(/[^\w.:@/#-]/g, '-').slice(0, 128);

	if (extra.trackedPage !== false) {
		const recipient: IDataObject = {};
		for (const [key, field] of [
			['name', 'recipientName'],
			['email', 'recipientEmail'],
			['phone', 'recipientPhone'],
		]) {
			if (text(extra[field])) recipient[key] = text(extra[field]);
		}
		const pageButton: IDataObject = { kind: 'link', label: button };
		if (link) pageButton.url = link;
		body.sharePage = { headline, button: pageButton, recipient };
	}
	return body;
}

export class MsgVibe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MsgVibe',
		name: 'msgVibe',
		icon: { light: 'file:../../icons/msgvibe.svg', dark: 'file:../../icons/msgvibe.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create personalized branded videos with their own tracked page',
		defaults: {
			name: 'MsgVibe',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'msgVibeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Video',
						value: 'video',
					},
				],
				default: 'video',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['video'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Make a branded video for one person or product (uses 1 credit)',
						action: 'Create a personal video',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the status, MP4 link and page link of a video',
						action: 'Get a video',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List your videos, newest first',
						action: 'Get many videos',
					},
				],
				default: 'create',
			},

			// ── video: create ──
			{
				displayName: 'Design Name or ID',
				name: 'design',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDesigns',
				},
				required: true,
				default: '',
				description:
					'The video design. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Brand Kit Name or ID',
				name: 'brandKit',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBrandKits',
				},
				default: '',
				description:
					'Logo, colours and contact details shown in the video. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'First Line',
				name: 'headline',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Hi Sarah!',
				description: 'The headline of the video, up to 40 characters',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Button Link',
						name: 'buttonLink',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://yourstore.com/offer',
						description: 'Where the button on the video page and the QR code lead',
					},
					{
						displayName: 'Button Text',
						name: 'buttonText',
						type: 'string',
						default: 'Learn more',
						description: 'The call to action in the video and on its page',
					},
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'options',
						options: [
							{ name: 'AUD', value: 'AUD' },
							{ name: 'CAD', value: 'CAD' },
							{ name: 'EUR', value: 'EUR' },
							{ name: 'GBP', value: 'GBP' },
							{ name: 'INR', value: 'INR' },
							{ name: 'USD', value: 'USD' },
						],
						default: 'USD',
					},
					{
						displayName: 'Offer Line',
						name: 'offer',
						type: 'string',
						default: '',
						placeholder: 'e.g. Use code SARAH20 for 20% off',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						typeOptions: { minValue: 0, numberPrecision: 2 },
						default: 0,
						description: 'Shown with the product photo',
					},
					{
						displayName: 'Product Name',
						name: 'productName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Product Photo URL',
						name: 'productImage',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://yourstore.com/images/jacket.jpg',
						description:
							'A public https image address. The product appears in the video only when this is set.',
					},
					{
						displayName: 'QR Code at the End',
						name: 'qrCode',
						type: 'boolean',
						default: false,
						description: 'Whether the last scene shows a QR code that opens the button link',
					},
					{
						displayName: 'Recipient Email',
						name: 'recipientEmail',
						type: 'string',
						placeholder: 'e.g. sarah@example.com',
						default: '',
						description: 'Returned with the Video Ready event, so a later step can send the video',
					},
					{
						displayName: 'Recipient Name',
						name: 'recipientName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Recipient Phone',
						name: 'recipientPhone',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Reference',
						name: 'reference',
						type: 'string',
						default: '',
						placeholder: 'e.g. order-1042',
						description:
							'Your own ID for this video, such as an order or lead number. Returned as externalId.',
					},
					{
						displayName: 'Sale Price',
						name: 'salePrice',
						type: 'number',
						typeOptions: { minValue: 0, numberPrecision: 2 },
						default: 0,
					},
					{
						displayName: 'Second Line',
						name: 'subtitle',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Size',
						name: 'size',
						type: 'options',
						options: [
							{ name: '1:1 (Square)', value: '1:1' },
							{ name: '16:9 (YouTube, Website)', value: '16:9' },
							{ name: '4:5 (Feed Post)', value: '4:5' },
							{ name: '9:16 (Reels, Stories, Shorts)', value: '9:16' },
						],
						default: '9:16',
					},
					{
						displayName: 'Tracked Page',
						name: 'trackedPage',
						type: 'boolean',
						default: true,
						description:
							'Whether the video gets its own page with the button. Views and clicks on it start the MsgVibe Trigger.',
					},
				],
			},

			// ── video: get ──
			{
				displayName: 'Video ID',
				name: 'videoId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. vid_1791306844787a1b2c3d4_0',
				description: 'The ID returned by Create, or by the MsgVibe Trigger',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['get'],
					},
				},
			},

			// ── video: get many ──
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Done', value: 'done' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Queued', value: 'queued' },
					{ name: 'Rendering', value: 'rendering' },
				],
				default: '',
				description: 'Only return videos with this status',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['getAll'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getDesigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await msgVibeApiRequest.call(this, 'GET', '/templates');
				return ((response.data as IDataObject[]) ?? [])
					.map((design) => ({
						name: String(design.name || design.uniqueId),
						value: String(design.uniqueId),
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
			async getBrandKits(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await msgVibeApiRequest.call(this, 'GET', '/brand-kits');
				return ((response.data as IDataObject[]) ?? []).map((kit) => ({
					name: String(kit.name || kit.id),
					value: String(kit.id),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let results: IDataObject[];

				if (operation === 'create') {
					const design = this.getNodeParameter('design', i) as string;
					const headline = text(this.getNodeParameter('headline', i));
					if (!headline) {
						throw new NodeOperationError(this.getNode(), 'First Line is empty', {
							itemIndex: i,
							description: 'Enter the headline of the video, for example "Hi Sarah!".',
						});
					}
					const body = videoBody(
						design,
						this.getNodeParameter('brandKit', i, '') as string,
						headline,
						this.getNodeParameter('additionalFields', i, {}) as IDataObject,
					);
					// A retry of the same execution and item returns the first video instead of charging again.
					const idempotencyKey = `n8n-${this.getWorkflow().id ?? 'wf'}-${this.getExecutionId() ?? Date.now()}-${i}`;
					const response = await msgVibeApiRequest.call(this, 'POST', '/videos', body, undefined, {
						'Idempotency-Key': idempotencyKey.slice(0, 100),
					});
					results = [response.video as IDataObject];
				} else if (operation === 'get') {
					const videoId = text(this.getNodeParameter('videoId', i));
					const response = await msgVibeApiRequest.call(
						this,
						'GET',
						`/videos/${encodeURIComponent(videoId)}`,
					);
					results = [response.video as IDataObject];
				} else if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const limit = returnAll ? Infinity : this.getNodeParameter('limit', i);
					const status = this.getNodeParameter('status', i, '') as string;
					results = [];
					let cursor: string | undefined;
					do {
						const qs: IDataObject = { limit: Math.min(100, limit - results.length) };
						if (status) qs.status = status;
						if (cursor) qs.cursor = cursor;
						const response = await msgVibeApiRequest.call(this, 'GET', '/videos', undefined, qs);
						results.push(...((response.data as IDataObject[]) ?? []));
						cursor = response.hasMore ? (response.nextCursor as string) : undefined;
					} while (cursor && results.length < limit);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex: i,
					});
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(results), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error instanceof NodeOperationError || error instanceof NodeApiError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
