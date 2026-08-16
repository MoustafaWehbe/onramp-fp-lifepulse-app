export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/** Rendered body of a template, ready to hand to a provider. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
