// Owner-approved location for the private pre-launch review. Opening is still being prepared.
export const studio = {
  address: 'Via San Colombano 43',
  city: 'Lodi',
  status: 'opening' as 'proposed' | 'opening' | 'open',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Via%20San%20Colombano%2043%2C%20Lodi',
};
export const studioCopy = {
  status: studio.status === 'open' ? 'Lezioni su appuntamento' : studio.status === 'opening' ? 'Sede confermata · Apertura in preparazione' : 'Nuova sede in valutazione',
  description: studio.status === 'open'
    ? 'Le lezioni in presenza si svolgono qui, su appuntamento. Ci accordiamo su giorno e orario.'
    : studio.status === 'opening'
      ? 'La sede è confermata e sto preparando l’apertura. Prima di fissare una lezione ci accordiamo su giorno e orario.'
      : 'Sto valutando questa sede per le lezioni in presenza. Confermerò indirizzo e apertura prima di fissare un appuntamento qui.',
  requestNote: studio.status === 'open'
    ? 'In presenza: Via San Colombano 43, Lodi, su appuntamento.'
    : 'Le lezioni in presenza saranno in Via San Colombano 43, Lodi. Sto preparando la sede: ci accordiamo su giorno e orario prima di confermare.',
};
