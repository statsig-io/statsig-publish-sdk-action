import {WebhookPayload} from '@actions/github/lib/interfaces';

export async function prepare(payload: WebhookPayload) {
  console.log(`Got Payload: ${JSON.stringify(payload)}`);
}
