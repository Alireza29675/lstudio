import { fetchWeatherApi } from 'openmeteo';

export const getWeatherForecast = async (latitude: number, longitude: number) => {
    const params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ["temperature_2m", "rain"]
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) =>
        Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    // Process first location. Add a for-loop for multiple locations or weather models
    const response = responses[0];

    // Attributes for timezone and location
    const utcOffsetSeconds = response.utcOffsetSeconds();

    const hourly = response.hourly()!;

    // Note: The order of weather variables in the URL query and the indices below need to match!
    const weatherData = {

        hourly: {
            time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
                (t) => new Date((t + utcOffsetSeconds) * 1000)
            ),
            temperature2m: hourly.variables(0)!.valuesArray()!,
            rain: hourly.variables(1)!.valuesArray()!,
        },

    };

    for (let i = 0; i < weatherData.hourly.time.length; i++) {
        // keep only for next 6 hours
        

        console.log(
            weatherData.hourly.time[i].toDateString(),
            weatherData.hourly.temperature2m[i],
            weatherData.hourly.rain[i]
        );
    }

    return weatherData;
}
