import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const BASE_URL = 'https://api.msgvibe.com/v1';

/** One authenticated call to the MsgVibe API. Errors keep the API's own message (`error`). */
export async function msgVibeApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
	headers?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		headers: { 'User-Agent': 'MsgVibe-n8n/1.0', ...headers },
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'msgVibeApi',
		options,
	)) as IDataObject;
}
