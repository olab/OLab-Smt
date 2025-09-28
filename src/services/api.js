import { Log, LogInfo, LogError } from "../utils/Logger";
import log from "loglevel";
import { config } from "../config";

let retryCount = 10;
if (config?.API_RETRY_COUNT) {
  retryCount = Number(config.API_RETRY_COUNT);
}

async function internetJsonFetch(
  method,
  url,
  payload,
  headerOverrides = null,
  settingsOverrides = null
) {
  let tries = 0;

  let headers = {
    "Content-Type": "application/json",
    ...headerOverrides,
  };

  let settings = {
    method: method,
    headers: headers,
    ...settingsOverrides,
  };

  if (payload) {
    if (headers["Content-Type"] == "application/json") {
      settings.body = JSON.stringify(payload);
    }
    else if (headers["Content-Type"] == "multipart/form-data") {
      delete headers["Content-Type"];
      settings.body = payload;
    }
  }

  while (tries++ < retryCount) {
    try {

      Log(`try #${tries} ${url}`);

      settings.signal = AbortSignal.timeout(30000);
      const response = await fetch(url, settings);

      let data = {};

      if (settings.responseType == "blob") {
        data.body = response.body;
        data.error_code = 200;
      } else {
        data = await response.json();
      }

      if (data.error_code === 401) {
        LogError(`URL '${url}': access denied ${JSON.stringify(data)}`);
        return data;
      }

      if (data.error_code === 404) {
        LogError(`URL '${url}': not found ${JSON.stringify(data)}`);
        return data;
      }

      if (data.error_code === 500) {
        LogError(`URL '${url}': server error ${JSON.stringify(data)}`);
        return data;
      }

      if (data.error_code !== 200) {
        LogError(
          `URL '${url}': ${JSON.stringify(data)}. try ${tries} of ${retryCount}`
        );
      } else {
        return data;
      }
    } catch (error) {
      LogError(
        `URL '${url}': ${error.message}. try ${tries} of ${retryCount}`
      );
    }
  }

  LogError(`URL '${url}': max retries ${retryCount} exceeded`);

  return {
    data: "max retries exceeded",
    errorCode: 500,
    message: `${URL}: server error`,
  };
}

async function loginUserAsync(credentials) {
  var payload = {
    UserName: credentials.username,
    Password: credentials.password,
  };
  let url = `${config.API_URL}/auth/login`;

  return await internetJsonFetch("POST", url, payload);
}

async function getUsers(token, searchTerm = null) {
  let url = `${config.API_URL}/auth/getusers`;
  if (searchTerm != null) {
    url += searchTerm;
  }
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function getGroups(token) {
  let url = `${config.API_URL}/groups`;
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function getRoles(token) {
  let url = `${config.API_URL}/roles`;
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function getMaps(token) {
  let url = `${config.API_URL}/maps`;
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function getNodes(token, mapId) {
  let url = `${config.API_URL}/maps/${mapId}/nodes`;
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function putUser(token, user) {

  let url = `${config.API_URL}/auth/edituser`;
  const data = await internetJsonFetch("PUT", url, user, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function postUser(token, user) {

  let url = `${config.API_URL}/auth/adduser`;
  const data = await internetJsonFetch("POST", url, user, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}


async function deleteUser(token, ids) {

  let body = [];
  for (const id of ids) {
    body.push({ id: id });
  }

  let url = `${config.API_URL}/auth/deleteuser`;
  const data = await internetJsonFetch("POST", url, body, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function queryAcls(
  token,
  objectTypes,
  groupId,
  roleId,
  mapIds,
  nodeIds,
  appIds) {

  let url = `${config.API_URL}/acls`;
  const data = await internetJsonFetch("POST", url, {
    types: objectTypes,
    groupId: groupId,
    roleId: roleId,
    mapIds: mapIds,
    nodeIds: nodeIds,
    appIds: appIds
  }, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

async function putAcl(
  token,
  acl
) {
  let url = `${config.API_URL}/acl`;
  const data = await internetJsonFetch("PUT", url, acl, {
    Authorization: `Bearer ${token}`
  });

  return data;
}

async function deleteAcl(
  token,
  acl
) {
  let url = `${config.API_URL}/acl/${acl.id}`;
  const data = await internetJsonFetch("DELETE", url, acl, {
    Authorization: `Bearer ${token}`
  });

  return data;
}

async function postAcl(
  token,
  acl
) {
  let url = `${config.API_URL}/acl`;
  const data = await internetJsonFetch("POST", url, acl, {
    Authorization: `Bearer ${token}`
  });

  return data;
}

async function importUsers(
  authToken,
  formData) {

  try {
    let url = `${config.API_URL}/auth/importusers`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authToken,
      },
      body: formData,
    });

    if (!response.ok) {
      LogError(`URL '${url}': Error uploading file ${response.status}`);
    }

    const json = await response.json(); // Read JSON response
    return json;

  } catch (error) {
      LogError(`User import upload failed ${error}`);
  }

}

async function getApplications(token) {
  let url = `${config.API_URL}/applications`;
  const data = await internetJsonFetch("GET", url, null, {
    Authorization: `Bearer ${token}`,
  });

  return data;
}

export {
  deleteAcl,
  deleteUser,
  queryAcls,
  getApplications,
  getGroups,
  getMaps,
  getNodes,
  getRoles,
  getUsers,
  loginUserAsync,
  postAcl,
  postUser,
  putAcl,
  putUser,
  importUsers
};
