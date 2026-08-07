// Starter knowledge base for the RAG layer (prompts/03–05).
// Each tip is one retrievable chunk. Edit / expand freely, then re-run
// POST /api/admin/knowledge/reindex to re-embed into D1 (kb_chunks).
// CF Workers have no runtime filesystem, so the KB is a bundled module
// rather than markdown read at request time.

export interface EnergyTip {
  id: string // stable — used as the kb_chunks primary key
  title: string
  appliance: string // 'Dishwasher' | 'EV charger' | … | 'general'
  content: string // the chunk text that gets embedded + retrieved
}

export const energyTips: EnergyTip[] = [
  {
    id: 'dishwasher-overnight',
    title: 'Run the dishwasher overnight',
    appliance: 'Dishwasher',
    content: 'Dishwashers are highly flexible loads. Use the delay-start timer to run a full load overnight (roughly 00:00–05:00), when Finland’s grid is usually windiest and carbon intensity is lowest. Always run full loads and use the eco programme to cut both energy and water use.'
  },
  {
    id: 'washing-machine-timing',
    title: 'Shift laundry to clean-grid windows',
    appliance: 'Washing machine',
    content: 'A washing machine can be delayed to any low-carbon window without affecting results. Wash at 30–40°C to cut most of the energy use, and start cycles during a forecast low-carbon window rather than at peak evening hours.'
  },
  {
    id: 'tumble-dryer-avoid-peak',
    title: 'Dry clothes off-peak or air-dry',
    appliance: 'Tumble dryer',
    content: 'Tumble dryers are among the most energy-hungry home appliances. When you must use one, run it during a low-carbon window and clean the lint filter each time to keep it efficient. Air-drying on a rack avoids the load entirely.'
  },
  {
    id: 'ev-overnight-charging',
    title: 'Charge your EV on the overnight window',
    appliance: 'EV charger',
    content: 'EV charging is the single most shiftable household load. Schedule charging for the overnight low-carbon window (commonly 01:00–05:00 in Finland) using the car or wallbox timer. Most drivers only need a full charge by morning, so there is no reason to charge during high-carbon evening peaks.'
  },
  {
    id: 'sauna-clean-window',
    title: 'Heat the electric sauna during clean hours',
    appliance: 'Sauna',
    content: 'An electric sauna draws 6–9 kW and is a large, discretionary load. Prefer heating it during a forecast low-carbon window, and only pre-heat for the time you actually need — modern sauna stoves reach temperature in under an hour.'
  },
  {
    id: 'hot-tub-schedule',
    title: 'Schedule hot-tub heating and keep it covered',
    appliance: 'Hot tub',
    content: 'Hot tubs reheat continuously. Set the heater schedule so the main reheat happens during low-carbon overnight hours, lower the set temperature by a couple of degrees, and always keep the insulated cover on to slash standby heat loss.'
  },
  {
    id: 'heat-pump-preheat',
    title: 'Pre-heat with the heat pump before carbon rises',
    appliance: 'Heat pump',
    content: 'Air-source and ground-source heat pumps let you pre-heat the home slightly during a clean, low-carbon window and coast through the following high-carbon hours. The building’s thermal mass stores the heat, so a small pre-heat shifts demand away from peaks.'
  },
  {
    id: 'water-heater-timer',
    title: 'Time the water heater to clean hours',
    appliance: 'general',
    content: 'A resistance hot-water tank is essentially a battery for heat. Put it on a timer to heat during the overnight low-carbon window; a well-insulated tank holds the heat through the day, avoiding reheats during high-carbon peaks.'
  },
  {
    id: 'general-overnight-wind',
    title: 'Overnight is usually the cleanest window',
    appliance: 'general',
    content: 'In Finland the grid is typically cleanest overnight and on windy days, when wind generation is high and demand is low. Carbon intensity often rises during the morning and evening demand peaks. Shifting flexible loads to overnight hours reliably lowers your carbon footprint.'
  },
  {
    id: 'general-check-forecast',
    title: 'Let the 24-hour forecast guide big loads',
    appliance: 'general',
    content: 'Before running a big flexible load, check the 24-hour carbon forecast and pick the lowest window that fits your day. Even shifting a load by a few hours can move it from a high-carbon peak to a much cleaner period.'
  },
  {
    id: 'general-avoid-evening-peak',
    title: 'Avoid stacking loads in the evening peak',
    appliance: 'general',
    content: 'The 17:00–21:00 evening peak is usually both the most expensive and one of the highest-carbon periods. Avoid running the dishwasher, laundry, sauna, and EV charging together in these hours; stagger them into cleaner windows instead.'
  },
  {
    id: 'general-spot-price-alignment',
    title: 'Clean hours often line up with cheap hours',
    appliance: 'general',
    content: 'On the Nord Pool spot market, low-price hours frequently coincide with high wind and low carbon intensity. If you are on a spot-priced contract, shifting flexible loads to the cheapest hours usually also cuts carbon — a win on both bills and emissions.'
  },
  {
    id: 'general-standby-loads',
    title: 'Trim always-on standby loads',
    appliance: 'general',
    content: 'Standby electronics, chargers, and idle devices draw power around the clock, including during high-carbon peaks. Use a switched power strip for entertainment and office setups so the base load — and its emissions — drop when the devices are not in use.'
  },
  {
    id: 'general-cold-snap',
    title: 'Cold snaps make timing matter more',
    appliance: 'general',
    content: 'During Finnish cold snaps, electric heating demand spikes and the grid may lean on higher-carbon imports and reserves. Pre-heating during cleaner windows and avoiding non-essential loads during the coldest peak hours has an outsized carbon benefit.'
  },
  {
    id: 'general-batch-cooking',
    title: 'Batch cooking reduces oven runs',
    appliance: 'Electric oven',
    content: 'Electric ovens are hard to time precisely around meals, but batch-cooking during a cleaner window and reheating later reduces the number of high-power oven runs. A microwave or air fryer for reheating uses far less energy than reheating in the oven.'
  },
  {
    id: 'general-fridge-efficiency',
    title: 'Keep cold appliances efficient',
    appliance: 'general',
    content: 'Fridges and freezers run continuously, so their efficiency matters more than their timing. Keep coils dust-free, maintain door seals, set sensible temperatures (fridge ~5°C, freezer ~-18°C), and keep the freezer reasonably full to reduce round-the-clock consumption.'
  },
  {
    id: 'general-why-carbon-varies',
    title: 'Why grid carbon intensity changes hour to hour',
    appliance: 'general',
    content: 'Grid carbon intensity reflects the mix of sources generating electricity right now. When wind, hydro, and nuclear dominate the mix, intensity is low; when demand outstrips clean supply and fossil or imported power fills the gap, it rises. Timing flexible use to clean-mix hours is the core idea behind low-carbon alerts.'
  },
  {
    id: 'general-small-shifts-add-up',
    title: 'Small, repeated shifts add up',
    appliance: 'general',
    content: 'No single shifted load saves much on its own, but moving a few flexible loads to cleaner windows every week compounds over a year into a meaningful carbon reduction — without buying anything or giving up comfort.'
  }
]
