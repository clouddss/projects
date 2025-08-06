import Subscription from '../models/subscription.model.js';

export const subscribe = async (data) => await Subscription.create(data);
