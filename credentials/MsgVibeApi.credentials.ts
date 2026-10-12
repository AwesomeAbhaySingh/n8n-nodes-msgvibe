import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MsgVibeApi implements ICredentialType {
	name = 'msgVibeApi';

	displayName = 'MsgVibe API';

	icon: Icon = { light: 'file:../icons/msgvibe.svg', dark: 'file:../icons/msgvibe.dark.svg' };

	documentationUrl = 'https://www.msgvibe.com/developers#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'mvk_live_…',
			description: 'Create one in MsgVibe Studio under Dashboard → API keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.msgvibe.com/v1',
			url: '/account',
			method: 'GET',
		},
	};
}
