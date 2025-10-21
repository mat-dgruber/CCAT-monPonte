import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import algoliasearch from "algoliasearch";

// Inicializa o SDK do Firebase Admin
admin.initializeApp();

// Inicializa o cliente Algolia com as chaves de Admin (seguras no ambiente)
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

// --- SINCRONIZAÇÃO DE CADERNOS (NOTEBOOKS) ---

const notebooksIndex = client.initIndex("notebooks");

/**
 * Acionada quando um caderno é criado, atualizado ou deletado no Firestore.
 * Mantém o índice 'notebooks' do Algolia sincronizado.
 */
export const syncNotebookToAlgolia = functions.firestore
  .document("users/{userId}/notebooks/{notebookId}")
  .onWrite(async (change, context) => {
    const notebookId = context.params.notebookId;

    // Se o caderno foi deletado, remove do Algolia
    if (!change.after.exists) {
      // Deleta o próprio caderno do índice de cadernos
      await notebooksIndex.deleteObject(notebookId);

      // Deleta todas as notas associadas a este caderno do índice de notas
      const notesIndex = client.initIndex("notes");
      return notesIndex.deleteBy({
        filters: `notebookId:${notebookId}`,
      });
    }

    // Se foi criado ou atualizado, salva no Algolia
    const notebookData = change.after.data();
    const record = {
      objectID: notebookId,
      name: notebookData.name,
      userId: context.params.userId,
      createdAt: notebookData.createdAt.toMillis(), // Converte Timestamp para milissegundos
    };

    return notebooksIndex.saveObject(record);
  });


// --- SINCRONIZAÇÃO DE NOTAS (NOTES) ---

const notesIndex = client.initIndex("notes");

/**
 * Acionada quando uma nota é criada, atualizada ou deletada no Firestore.
 * Mantém o índice 'notes' do Algolia sincronizado.
 */
export const syncNoteToAlgolia = functions.firestore
  .document("users/{userId}/notebooks/{notebookId}/notes/{noteId}")
  .onWrite(async (change, context) => {
    const noteId = context.params.noteId;

    // Se a nota foi deletada, remove do índice
    if (!change.after.exists) {
      return notesIndex.deleteObject(noteId);
    }

    // Se foi criada ou atualizada, salva no índice
    const noteData = change.after.data();
    const record = {
      objectID: noteId,
      title: noteData.title,
      content: noteData.content,
      userId: context.params.userId,
      notebookId: context.params.notebookId,
      createdAt: noteData.createdAt.toMillis(),
    };

    return notesIndex.saveObject(record);
  });


// --- GERAÇÃO DE CHAVE DE BUSCA SEGURA ---

/**
 * Função "Callable" que o frontend pode chamar para obter uma chave de busca
 * segura e restrita apenas aos dados do usuário autenticado.
 */
export const getAlgoliaSearchKey = functions.https.onCall((data, context) => {
  // Verifica se o usuário está autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  const uid = context.auth.uid;

  // Gera a chave de busca segura com o filtro embutido.
  const securedApiKey = client.generateSecuredApiKey(
    functions.config().algolia.search_key, // Usa a "Search-Only API Key" como base
    {
      // O filtro é aplicado no lado do servidor e não pode ser sobrescrito.
      filters: `userId:${uid}`,
    }
  );

  // Retorna a chave segura para o cliente.
  return { key: securedApiKey };
});
