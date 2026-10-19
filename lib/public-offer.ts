// Owner-approved location for the private pre-launch review. Opening is still being prepared.
export const studio = {
  address: 'Via San Colombano 43',
  city: 'Lodi',
  floor: 'Piano terra',
  entrance: 'Il citofono viene comunicato privatamente.',
  parking: 'Di fronte allo studio c’è un ampio parcheggio gratuito.',
  status: 'opening' as 'proposed' | 'opening' | 'open',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Via%20San%20Colombano%2043%2C%20Lodi',
};
export const studioCopy = {
  description: studio.status === 'open'
    ? 'Le lezioni in presenza si svolgono qui, su appuntamento. Ci accordiamo su giorno e orario.'
    : studio.status === 'opening'
      ? 'Per le lezioni in presenza ci accordiamo prima su giorno e orario.'
      : 'Sto valutando questa sede per le lezioni in presenza. Confermerò indirizzo e apertura prima di fissare un appuntamento qui.',
  requestNote: studio.status === 'open'
    ? 'In presenza: Via San Colombano 43, Lodi, su appuntamento.'
    : 'In presenza: Via San Colombano 43, Lodi. Giorno e orario vanno concordati prima della conferma.',
};
