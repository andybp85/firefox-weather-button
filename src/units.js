const CELSIUS_TO_FAHRENHEIT_RATIO = 9 / 5
const FAHRENHEIT_OFFSET = 32
const FEET_PER_METRE = 3.280839895

export const celsiusToFahrenheit = celsius => celsius * CELSIUS_TO_FAHRENHEIT_RATIO + FAHRENHEIT_OFFSET

export const metresToFeet = metres => metres * FEET_PER_METRE
