import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { msgVibeApiRequest } from './transport';

export class MsgVibeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MsgVibe Trigger',
		name: 'msgVibeTrigger',
		icon: { light: 'file:../../icons/msgvibe.svg', dark: 'file:../../icons/msgvibe.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a MsgVibe video is ready, viewed or clicked',
		defaults: {
			name: 'MsgVibe Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'msgVibeApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				required: true,
				default: 'video.completed',
				options: [
					{
						name: 'Batch Finished',
						value: 'batch.completed',
						description: 'Every video of a batch is done, failed or cancelled',
					},
					{
						name: 'Video Button Clicked',
						value: 'video.clicked',
						description: 'Someone clicked the button on a video page for the first time',
					},
					{
						name: 'Video Failed',
						value: 'video.failed',
						description: 'A video could not be made (its credit is refunded)',
					},
					{
						name: 'Video Ready',
						value: 'video.completed',
						description: 'A video has finished rendering',
					},
					{
						name: 'Video Viewed',
						value: 'video.viewed',
						description: 'Someone opened a video page for the first time',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const staticData = this.getWorkflowStaticData('node');
				const response = await msgVibeApiRequest.call(this, 'GET', '/hooks');
				const hook = ((response.data as IDataObject[]) ?? []).find(
					(h) => h.url === webhookUrl && h.event === event,
				);
				if (hook) staticData.hookId = hook.id;
				else delete staticData.hookId;
				return Boolean(hook);
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const response = await msgVibeApiRequest.call(this, 'POST', '/hooks', {
					event: this.getNodeParameter('event') as string,
					url: this.getNodeWebhookUrl('default'),
				});
				this.getWorkflowStaticData('node').hookId = (response.hook as IDataObject).id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.hookId) return true;
				try {
					await msgVibeApiRequest.call(this, 'DELETE', `/hooks/${staticData.hookId}`);
				} catch (error) {
					this.logger.warn(
						`MsgVibe hook ${staticData.hookId} could not be removed: ${(error as Error).message}`,
					);
					return false;
				}
				delete staticData.hookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// MsgVibe posts { event, deliveryId, createdAt, data }: the workflow gets the event's data.
		const body = this.getBodyData();
		const data = (body.data as IDataObject) ?? body;
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					...data,
					event: body.event ?? data.event,
					deliveryId: body.deliveryId,
				}),
			],
		};
	}
}
