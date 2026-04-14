const app_name = '174.138.45.229';

export function buildPath(route: string) {
    // Vite uses import.meta.env.DEV to check if you are running locally
    if (import.meta.env.DEV) {
        return 'http://localhost:5000/' + route;
    } else {
        return 'http://' + app_name + ':5000/' + route;
    }
}