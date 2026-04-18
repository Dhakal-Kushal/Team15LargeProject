const app_name = 'team15study.com';

export function buildPath(route: string) {
    // Vite uses import.meta.env.DEV to check if running locally
    if (import.meta.env.DEV) {
        return 'http://localhost:5000/' + route;
    } else {
        return 'https://' + app_name + '/' + route;
    }
}
