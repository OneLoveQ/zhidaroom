import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common';
import { request } from 'node:https';
import { URL } from 'node:url';

interface MimoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MimoVisionContent[];
}

interface MimoVisionContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface MimoResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

@Injectable()
export class MimoClient {
  async complete(prompt: string): Promise<string> {
    return this.completeMessages(this.createMessages(prompt));
  }

  async completeVision(prompt: string, imageDataUrl: string): Promise<string> {
    return this.completeMessages([
      {
        role: 'system',
        content: '你是严谨的教育题目图片识别助手，只输出合法 JSON。'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }
    ]);
  }

  private async completeMessages(messages: MimoMessage[]): Promise<string> {
    const apiUrl = process.env.MIMO_API_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions';
    const apiKey = process.env.MIMO_API_KEY;
    const model = process.env.MIMO_MODEL ?? 'mimo-v2.5-pro';

    if (!apiUrl || !apiKey) {
      throw new ServiceUnavailableException('大模型服务尚未配置');
    }

    const data = await this.postChatCompletion(apiUrl, apiKey, {
      model,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    if (data.error) {
      const message = data.error.type ?? data.error.code ?? 'unknown_error';
      throw new BadGatewayException(`大模型调用失败: ${message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException('大模型响应缺少内容');
    }

    return content;
  }

  private postChatCompletion(
    apiUrl: string,
    apiKey: string,
    payload: unknown
  ): Promise<MimoResponse> {
    const url = new URL(apiUrl);
    const body = JSON.stringify(payload);
    const allowInsecureTls = process.env.MIMO_ALLOW_INSECURE_TLS === 'true';

    return new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: url.hostname,
          path: `${url.pathname}${url.search}`,
          port: url.port ? Number(url.port) : 443,
          method: 'POST',
          rejectUnauthorized: !allowInsecureTls,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as MimoResponse);
            } catch {
              reject(new BadGatewayException(`大模型响应无法解析: ${res.statusCode}`));
            }
          });
        }
      );

      req.on('error', () => {
        reject(new BadGatewayException('大模型网络调用失败'));
      });
      req.write(body);
      req.end();
    });
  }

  private createMessages(prompt: string): MimoMessage[] {
    return [
      {
        role: 'system',
        content: '你是严谨的教育题目生成助手，只输出合法 JSON。'
      },
      { role: 'user', content: prompt }
    ];
  }
}
