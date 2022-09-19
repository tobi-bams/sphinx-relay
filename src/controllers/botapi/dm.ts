import { Action, validateAction } from './index'
import { sphinxLogger } from '../../utils/logger'
import { models, ChatRecord, Message, ContactRecord } from '../../models'
import * as md5 from 'md5'
import * as short from 'short-uuid'
import constants from '../../constants'
import * as network from '../../network'
import * as rsa from '../../crypto/rsa'

export default async function dm(a: Action): Promise<void> {
  const { amount, content, bot_name, pubkey } = a

  sphinxLogger.info(`=> BOT DM ${JSON.stringify(a, null, 2)}`)
  const ret = await validateAction(a)
  if (!ret) return
  const owner = ret.owner
  const tenant: number = owner.id
  const alias = bot_name || owner.alias
  if (!pubkey) return sphinxLogger.error('bot DM no pubkey')
  if (pubkey.length !== 66) return sphinxLogger.error('bot DM bad pubkey')

  const contact = (await models.Contact.findOne({
    where: { publicKey: pubkey, tenant },
  })) as ContactRecord
  if (!contact) return sphinxLogger.error('bot DM no contact')

  const uuid = md5([owner.publicKey, pubkey].sort().join('-'))

  const chat: ChatRecord = (await models.Chat.findOne({
    where: { uuid },
  })) as ChatRecord

  const encryptedForMeText = rsa.encrypt(owner.contactKey, content || '')
  const encryptedForThemText = rsa.encrypt(contact.contactKey, content || '')
  const date = new Date()
  date.setMilliseconds(0)
  const msg: { [k: string]: string | number | Date } = {
    chatId: chat.id,
    uuid: short.generate(),
    type: constants.message_types.message,
    sender: owner.id,
    amount: amount || 0,
    date: date,
    messageContent: encryptedForMeText,
    status: constants.statuses.confirmed,
    createdAt: date,
    updatedAt: date,
    senderAlias: alias,
    tenant,
  }
  const message: Message = (await models.Message.create(msg)) as Message

  await network.sendMessage({
    chat: chat as any,
    sender: owner.dataValues,
    message: {
      content: encryptedForThemText,
      amount: message.amount,
      id: message.id,
      uuid: message.uuid,
    },
    type: constants.message_types.message,
    success: () => ({ success: true }),
    failure: (e) => {
      return sphinxLogger.error(e)
    },
  })
}
