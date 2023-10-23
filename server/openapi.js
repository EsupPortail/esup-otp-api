export default {
  "openapi": "3.0.3",
  "info": {
    "title": "esup-otp-api",
    "description": "",
    "version": "1.1.2"
  },
  "tags": [
    {
      "name": "protected",
      "description": "API server-side pour manipuler les méthodes/transports d'un utilisateur"
    }
  ],
  "security": [
    {
      "BearerAuth": []
    }
  ],
  "paths": {
    "/protected/users/{uid}": {
      "get": {
        "tags": [
          "protected"
        ],
        "summary": "Renvoie les infos (methodes activées, transports) de utilisateur",
        "operationId": "get_user_infos",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok",
                  "message": "",
                  "user": {
                    "methods": {
                      "codeRequired": true,
                      "waitingFor": true,
                      "totp": {
                        "active": true
                      },
                      "random_code": {
                        "active": true,
                        "transports": [
                          "sms"
                        ]
                      },
                      "random_code_mail": {
                        "active": false,
                        "transports": [
                          "mail"
                        ]
                      },
                      "bypass": {
                        "active": true,
                        "available_code": 10
                      },
                      "push": {
                        "active": true,
                        "transports": [
                          "push"
                        ]
                      }
                    },
                    "transports": {
                      "mail": "tmp@*****ux.org",
                      "sms": "06******767",
                      "push": "samsung SM-A510F"
                    },
                    "last_send_message": {
                      "method": "push",
                      "time": 1696701874596,
                      "auto": true
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/{otp}": {
      "post": {
        "tags": [
          "protected"
        ],
        "summary": "Vérifie le code pour l'utilisateur",
        "operationId": "verify_code",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "otp",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok",
                  "message": "..."
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/transports/{transport}/{value}": {
      "put": {
        "tags": [
          "protected"
        ],
        "summary": "Modifie ou ajoute le SMS/mail/... pour le transport et l'utilisateur",
        "operationId": "set_user_transport_value",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "transport",
            "description": "\"sms\" ou \"mail\" ou \"push\"",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "value",
            "description": "le SMS ou le courriel ou ...",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok",
                  "message": "..."
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/transports/{transport}": {
      "delete": {
        "tags": [
          "protected"
        ],
        "summary": "Supprime la valeur pour le transport (SMS, mail...) pour l'utilisateur",
        "description": "NB: cela désactive la méthode associée",
        "operationId": "delete_user_transport_value",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "transport",
            "description": "\"sms\" ou \"mail\" ou \"push\"",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok"
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/methods/{method}/activate": {
      "put": {
        "tags": [
          "protected"
        ],
        "summary": "Active la méthode pour l'utilisateur",
        "description": "NB : si la méthode utilise un transport, il faut qu'il soit déjà paramétré",
        "operationId": "activate_user_method",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "method",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok",
                  "message": ""
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/methods/{method}/deactivate": {
      "put": {
        "tags": [
          "protected"
        ],
        "summary": "Désactive la méthode pour l'utilisateur",
        "operationId": "deactivate_user_method",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "method",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "example": {
                  "code": "Ok",
                  "message": ""
                }
              }
            }
          }
        }
      }
    },
    "/protected/users/{uid}/methods/{method}/secret": {
      "post": {
        "tags": [
          "protected"
        ],
        "summary": "Génére un nouvel attribut d'auth (TOTP ou bypass codes)",
        "operationId": "generate_user_method_secret",
        "parameters": [
          {
            "name": "uid",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "method",
            "in": "path",
            "schema": { "type": "string" },
            "required": true
          },
          {
            "name": "codes_number",
            "in": "query",
            "schema": { "type": "string" },
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "examples": {
                  "bypass": {
                    "value": {
                      "code": "Ok",
                      "codes": [
                        "123456",
                        "231232"
                      ]
                    }
                  },
                  "totp": {
                    "value": {
                      "code": "Ok",
                      "message": "LYCFS3CLPY3CCR2PP4JBEGTEPQ",
                      "qrCode": "<img src='data:image/png;base64,iVBORw0KGgoAA...' width='164' height='164'>"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "passer `api_password` (cf properties/esup.json)",
      }
    }
  }
}