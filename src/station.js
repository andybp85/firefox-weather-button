// A station id is user-typed and case-insensitive; normalise before it ever
// reaches the client so a lowercase or padded id doesn't read as a different
// station than its trimmed, uppercase form.
export const validateStation = async ({ client, stationId }) => {
    const normalised = stationId.trim().toUpperCase()
    // Relies on two guarantees from nws.js: fetchObservations throws for an unknown station
    // (AWC answers with an empty array rather than an error), and it returns the series
    // sorted newest-first, which is what makes destructuring the first record correct.
    const [newest] = await client.fetchObservations(normalised)
    // Some stations report observations with no station name; fall back to
    // the id itself rather than storing an undefined name.
    return { name: newest.name ?? normalised, stationId: normalised }
}
