// Espy's approximation: cloud base rises roughly 125 m for each degree Celsius of
// dewpoint depression. https://glossary.ametsoc.org/wiki/Lifted_condensation_level
const METRES_PER_DEGREE_OF_SPREAD = 125

export const lclMetres = ({ dewpointCelsius, temperatureCelsius }) => METRES_PER_DEGREE_OF_SPREAD * (temperatureCelsius - dewpointCelsius)
