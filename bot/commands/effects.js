export async function handleEffects(ctx) {
  const { sock, groupId } = ctx

  await sock.sendMessage(groupId, {
    text: 'Comando de efeitos ainda nao configurado.'
  })
}
