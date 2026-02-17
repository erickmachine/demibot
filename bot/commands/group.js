export async function handleGroup(ctx) {
  const { sock, groupId } = ctx

  await sock.sendMessage(groupId, {
    text: 'Comando de grupo ainda nao configurado.'
  })
}
