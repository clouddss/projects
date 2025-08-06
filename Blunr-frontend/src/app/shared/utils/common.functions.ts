export const removeSlashFromRouteName = (routeName: string) => {
    return routeName.replace(/^\/|\/$/g, '');
};