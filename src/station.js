// A station id is user-typed and case-insensitive; normalise before it ever
// reaches the client so a lowercase or padded id doesn't read as a different
// station than its trimmed, uppercase form.
export const validateStation = async ({ client, stationId }) => {
    const normalised = stationId.trim().toUpperCase()
    // Relies on fetchObservations throwing for an unknown station: AWC answers with an
    // empty array rather than an error, and nws.js converts that into a throw.
    const [newest] = await client.fetchObservations(normalised)
    // Some stations report observations with no station name; fall back to
    // the id itself rather than storing an undefined name.
    return { name: newest.name ?? normalised, stationId: normalised }
}
