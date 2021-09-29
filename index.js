const axios = require("axios");
const Joi = require("@hapi/joi");
const moment = require("moment");

const deliveryTypes = ["sameDay", "nextDay", "99minutos", "CO2"];

const packageSizes = ["xs", "s", "m", "l", "xl"];

const countries = ["MEX", "CHL", "COL", "PER"];

const originFormat = Joi.object({
  sender: Joi.string().required(),
  nameSender: Joi.string().required(),
  lastNameSender: Joi.string().required(),
  emailSender: Joi.string().required(),
  phoneSender: Joi.string().required(),
  phoneSender: Joi.string().required(),
  addressOrigin: Joi.string().required(),
  numberOrigin: Joi.string().required(),
  codePostalOrigin: Joi.string().required(),
  country: Joi.string().required(),
});

const destinationFormat = Joi.object({
  receiver: Joi.string().required(),
  nameReceiver: Joi.string().required(),
  lastNameReceiver: Joi.string().required(),
  emailReceiver: Joi.string().required(),
  phoneReceiver: Joi.string().required(),
  phoneReceiver: Joi.string().required(),
  addressDestination: Joi.string().required(),
  numberDestination: Joi.string().required(),
  codePostalDestination: Joi.string().required(),
  country: Joi.string().required(),
});

class Minutos99 {
  api_key;
  base_url;
  token;
  headers;

  constructor(api_key, env) {
    this.api_key = api_key;
    this.base_url =
      env === "production"
        ? "https://delivery.99minutos.com"
        : "https://sandbox.99minutos.com";
    this.token = ` bearer ${this.api_key}`;
    this.headers = {
      headers: {
        Authorization: this.token,
      },
    };
  }

  cotizar = (
    zip_origin,
    country_origin,
    zip_destination,
    country_destination,
    { weight, width, depth, height }
  ) =>
    new Promise((resolve, reject) => {
      if (!zip_origin) return reject("origin zip is invalid");
      if (!countries.includes(country_origin)) {
        return reject("origin country is invalid");
      }
      if (!zip_destination) reject("destination zip is invalid");
      if (!countries.includes(country_destination)) {
        return reject("destination country is invalid");
      }
      const url = `${this.base_url}/api/v1/shipping/rates`;
      axios
        .post(
          url,
          {
            origin: {
              codePostal: zip_origin,
              country: country_origin,
            },
            destination: {
              codePostal: zip_destination,
              country: country_destination,
            },
            weight,
            width,
            depth,
            height,
          },
          this.headers
        )
        .then((res) => {
          resolve(res.data.message);
        })
        .catch((error) => {
          reject(error.response);
        });
    });

  trackOrder = (trackingNumber) =>
    new Promise((resolve, reject) => {
      if (!trackingNumber) return reject("trackingNumber is invalid");
      const url = `${this.base_url}/api/v1/tracking/order?tracking=${trackingNumber}`;
      axios
        .get(url, this.headers)
        .then((res) => {
          const packages = res.data;
          resolve(packages);
        })
        .catch((error) => {
          reject(error);
        });
    });

  createOrder = (
    deliveryType,
    packageSize,
    notes,
    origin,
    destination,
    cahsOnDelivery,
    amountCash,
    SecurePackage,
    amountSecure,
    receivedId,
    pickup_after
  ) =>
    new Promise((resolve, reject) => {
      if (!deliveryTypes.includes(deliveryType)) {
        let message = "deliveryType is invalid";
        return reject(message);
      }
      if (!packageSizes.includes(packageSize)) {
        let message = "packageSize is invalid";
        return reject(message);
      }
      if (!origin) {
        return reject("origin is invalid");
      }
      let validation = originFormat.validate(origin);
      if (validation.error) {
        let first = validation.error.details[0];
        let message = first.message;
        return reject(message);
      }
      if (!countries.includes(origin.country)) {
        let message = "origin country is invalid";
        return reject(message);
      }
      if (!destination) {
        return reject("destination is invalid");
      }
      validation = destinationFormat.validate(destination);
      if (validation.error) {
        let first = validation.error.details[0];
        let message = first.message;
        return reject(message);
      }
      if (!countries.includes(destination.country)) {
        let message = "origin country is invalid";
        return reject(message);
      }
      const url = `${this.base_url}/api/v1/autorization/order`;
      axios
        .post(url, {
          apikey: this.api_key,
          deliveryType,
          packageSize,
          notes,
          cahsOnDelivery,
          amountCash,
          SecurePackage,
          amountSecure,
          receivedId,
          origin,
          destination,
          pickup_after,
        })
        .then((res) => {
          const message = res.data.message[0];
          if (message.message === "Creado") {
            resolve(message.reason);
          }
        })
        .catch((error) => {
          reject(error.response);
        });
    });

  generatePDF = (counter, base64, size, orientation) =>
    new Promise((resolve, reject) => {
      if (!counter) return reject("counter is invalid");
      const url = `${this.base_url}/api/v1/guide/order`;
      if (!base64) base64 = false;
      if (!size) size = "letter";
      if (!orientation) orientation = "portrait";
      axios
        .post(url, {
          counter,
          base64,
          size,
          orientation,
        })
        .then((res) => {
          resolve(res.data.message);
        })
        .catch((error) => {
          reject(error.response);
        });
    });

  collectOrder = (orderNumber, date) =>
    new Promise((resolve, reject) => {
      const url = `${this.base_url}/api/v1/orders/collect`;
      if (!date) date = moment().format("YYYY-MM-DD HH:mm:ss");
      axios
        .post(url, {
          orders: [orderNumber],
          pickup_at: date,
        })
        .then((res) => {
          resolve(res.data.message);
        })
        .catch((error) => {
          reject(error.response);
        });
    });

  collectMultiOrder = (orders, date) =>
    new Promise((resolve, reject) => {
      const url = `${this.base_url}/api/v1/orders/collect`;
      if (!date) date = moment().format("YYYY-MM-DD HH:mm:ss");
      axios
        .post(url, {
          orders,
          pickup_at: date,
        })
        .then((res) => {
          resolve(res.data.message);
        })
        .catch((error) => {
          reject(error.response);
        });
    });

  cancelOrder = (number) =>
    new Promise((resolve, reject) => {
      const url = `${this.base_url}/api/v1/cancel/order`;
      axios
        .post(url, {
          counters: [number],
        })
        .then((res) => {
          resolve(res.data.message);
        })
        .catch((error) => {
          reject(error.response);
        });
    });
}

module.exports = Minutos99;
