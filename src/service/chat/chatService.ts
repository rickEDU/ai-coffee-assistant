import {
  createFacts,
} from '@/src/repository/facts/factsRepo';
import {
  createChatMessage,
  getChatMessagesByUserId,
} from '@/src/repository/chat/chatRepo';
import { coffeeAgent } from '@/src/mastra/agents/coffeeAgent';
import { memoryAgent } from '@/src/mastra/agents/memoryAgent';

const TAG = 'SERVICE(POST): chat ';

export async function chatMessageService(id: string, message: string): Promise<string> {
  try {  
    const response = await coffeeAgent.generate( ` Usuário ID: ${id} Mensagem: ${message} `, );
    await createChatMessage(id, message, response.text);
    void extractFactsAgentResponse(id, message);

    return response.text;
  } catch (e: any) {
    console.log(TAG, e);
    if (!e.status) {
      e.status = 500;
    }
    throw e;
  }
}

export async function chatHistoryService(id: string) {
  try {
    const chatHistory = await getChatMessagesByUserId(id);
    return chatHistory;
  } catch (e: any) {
    console.log(TAG, e);
    if (!e.status) {
      e.status = 500;
    }
    throw e;
  }
}

async function extractFactsAgentResponse(id: string, message: string) {
  try {
    const facts = await memoryAgent.generateLegacy(` Usuário ID: ${id} Mensagem: ${message} `, );
    console.log(TAG, 'facts', facts);
    if (facts.text) {
      const parsedFacts = JSON.parse(facts.text)?.facts;
      if (parsedFacts.length) {
        const factsToStore = parsedFacts.map((fact: { type: string; item: string; category: string }) => ({
          ...fact,
          user_id: id,
        }));
        await createFacts(factsToStore);
      }
    }
  } catch (e) {
    console.log(TAG, 'Error extracting facts from memory agent response', e);
  }
}
