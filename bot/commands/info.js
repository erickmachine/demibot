export async function handleInfo(ctx) {
  const { sock, groupId } = ctx

  await sock.sendMessage(groupId, {
    text: 'Comando de informacoes ainda nao configurado.'
  })
}
