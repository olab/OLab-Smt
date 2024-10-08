import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { useState, useEffect } from "react";

import MDBox from "@/components/MDBox";
import MDTypography from "@/components/MDTypography";
import DashboardLayout from "@/components/DashboardLayout";
import MDButton from "@/components/MDButton";
import ConfirmDialog from "@/components/ConfirmDialog";

import { AclQuery } from "./components/AclQuery";

import mapTableLayout from "./layouts/mapTableLayout";
import nodeTableLayout from "./layouts/nodeTableLayout";
import aclTableLayout from "./layouts/aclTableLayout";
import tableLayout from "./layouts/tableLayout";

import { useAuth } from "../../hooks/useAuth";
import { Log, LogInfo, LogError, LogEnable } from "../../utils/Logger";

// Data
import {
  deleteAcl,
  getAcls,
  getGroups,
  getRoles,
  postAcl,
  putAcl,
} from "../../services/api";

export default function AclPage() {
  const [aclSelectionIds, setAclSelection] = useState([]);
  const [aclTableColumns, setAclTableColumns] = useState(
    aclTableLayout.columns
  );
  const [aclTableRows, setAclTableRows] = useState([]);

  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(-1);
  const [aclTableLoading, setAclTableLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [selectedMapIds, setMapSelection] = useState([]);
  const [mapTableData, setMapTableData] = useState(mapTableLayout);
  const [selectedNodeIds, setNodeSelection] = useState([]);
  const [nodeTableData, setNodeTableData] = useState(nodeTableLayout);
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(-1);
  const [nextIndex, setNextIndex] = useState(-1);
  const apiRef = useGridApiRef();

  const { user } = useAuth();

  useEffect(() => {
    let newAclTableColumns = [...aclTableColumns];

    // dynamically create group/role select list based on
    // results of database requests
    getGroups(user.authInfo.token).then((response) => {
      setGroups(response.data);

      let columnDef = newAclTableColumns.filter(
        (column) => column.field == "groupName"
      );
      columnDef.valueOptions = groups;

      getRoles(user.authInfo.token).then((response) => {
        setRoles(response.data);

        let columnDef = newAclTableColumns.filter(
          (column) => column.field == "roleName"
        );
        columnDef.valueOptions = roles;

        setAclTableColumns(newAclTableColumns);
      });
    });
  }, []);

  const refreshAclData = (mapIds = [], nodeIds = []) => {
    setAclTableLoading(true);

    Log(`mapIds = ${mapIds}, nodeIds = ${nodeIds}`);

    getAcls(
      user.authInfo.token,
      groupId < 0 ? null : groupId,
      roleId < 0 ? null : roleId,
      mapIds,
      nodeIds
    ).then((response) => {
      setAclTableRows(response.data);
    });

    setAclTableLoading(false);
  };

  const onAclSelectionChanged = (selectedAclIds) => {
    Log(`onAclSelectionChanged ${selectedAclIds}`);
    setAclSelection(selectedAclIds);
  };

  const onLoadAclClicked = () => {
    refreshAclData(selectedMapIds, selectedNodeIds);
  };

  const onSaveAclClicked = () => {
    setConfirmDialog({
      title: "Confirmation",
      message: `Save ACL Changes?`,
      onCancelClicked: () => {
        setConfirmDialog(null);
      },
      onConfirmClicked: () => {
        setConfirmDialog(null);
        saveChangedAcls();
      },
    });
  };

  const saveChangedAcls = () => {
    for (const aclTableRow of aclTableRows) {
      if (aclTableRow.id < 0) {
        postAcl(user.authInfo.token, aclTableRow).then((response) => {
          Log(`acl id: ${aclTableRow.id} added`);
        });
        continue;
      }

      if (aclTableRow.status == 2) {
        putAcl(user.authInfo.token, aclTableRow).then((response) => {
          Log(`acl id: ${aclTableRow.id} edited`);
        });
        continue;
      }

      if (aclTableRow.status == 3) {
        deleteAcl(user.authInfo.token, aclTableRow).then((response) => {
          Log(`acl id: ${aclTableRow.id} delete`);
        });
        continue;
      }

      Log(`acl id: ${aclTableRow.id} unchanged`);
    }
  };

  const onClearAclClicked = () => {
    setConfirmDialog({
      title: "Confirmation",
      message: `Clear ACL Table?`,
      onCancelClicked: () => {
        setConfirmDialog(null);
      },
      onConfirmClicked: () => {
        setConfirmDialog(null);
        setAclTableRows([]);
      },
    });
  };

  const onCellClick = (cell) => {
    if (
      cell.field !== "read" &&
      cell.field !== "write" &&
      cell.field !== "execute"
    ) {
      return;
    }

    // set 'changed' flag in record
    setAclTableRows(
      aclTableRows.map((row) => {
        if (row.id === cell.row.id) {
          return { ...row, status: 2 };
        } else {
          return row;
        }
      })
    );
  };

  const onDeleteAclClicked = () => {
    Log("delete clicked");
    Log(JSON.stringify(aclSelectionIds));
    deleteSelectedAcls();
  };

  const deleteSelectedAcls = () => {
    // reset the map selections manually
    // since settings the model doesn't
    // appear to work
    apiRef.current.setRowSelectionModel([]);

    // toggle 'deleted' flag in selected records
    setAclTableRows(
      aclTableRows.map((row) => {
        if (aclSelectionIds.includes(row.id)) {
          // undelete, if already marked deleted
          if (row.status == 3) {
            return { ...row, status: null };
          }
          return { ...row, status: 3 };
        } else {
          return row;
        }
      })
    );
  };

  const onCreateAclClicked = () => {
    const selectedGroup = groups.filter((group) => group.id == groupId);
    const selectedRole = roles.filter((role) => role.id == roleId);
    const selectedMaps = mapTableData.rows.filter((map) =>
      selectedMapIds.includes(map.id)
    );
    const selectedNodes = nodeTableData.rows.filter((node) =>
      selectedNodeIds.includes(node.id)
    );

    Log(`${JSON.stringify(selectedGroup)} ${JSON.stringify(selectedRole)}`);
    Log(` ${JSON.stringify(selectedMaps)}`);
    Log(` ${JSON.stringify(selectedNodes)}`);

    let newAclRows = [...aclTableRows];
    let index = nextIndex;

    if (selectedNodeIds.length > 0) {
      for (const selectedNodeId of selectedNodeIds) {
        const newRecord = {
          execute: false,
          read: false,
          write: false,
          objectType: "Nodes",
          id: index--,
          groupId: selectedGroup.length == 0 ? 0 : selectedGroup[0].id,
          objectIndex: selectedNodeId,
          roleId: selectedRole.length == 0 ? 0 : selectedRole[0].id,
          groupName: selectedGroup.length == 0 ? "*" : selectedGroup[0].name,
          roleName: selectedRole.length == 0 ? "*" : selectedRole[0].name,
        };

        newAclRows.push(newRecord);
      }
    } else if (selectedMapIds.length > 0) {
      for (const selectedMapId of selectedMapIds) {
        const newRecord = {
          execute: false,
          read: false,
          write: false,
          objectType: "Maps",
          id: index--,
          groupId: selectedGroup.length == 0 ? 0 : selectedGroup[0].id,
          objectIndex: selectedMapId,
          roleId: selectedRole.length == 0 ? 0 : selectedRole[0].id,
          groupName: selectedGroup.length == 0 ? "*" : selectedGroup[0].name,
          roleName: selectedRole.length == 0 ? "*" : selectedRole[0].name,
        };

        newAclRows.push(newRecord);
      }
    }

    setNextIndex(index);
    setAclTableRows(newAclRows);
  };

  if (confirmDialog != null) {
    <ConfirmDialog data={confirmDialog} />;
  }

  const onStateChange = (state) => {
    Log(`onStateChange: ${JSON.stringify(state, null, 1)}`);

    if (state.groupId != groupId) {
      setGroupId(state.groupId);
    }

    if (state.roleId != roleId) {
      setRoleId(state.roleId);
    }

    setNodeSelection(state.selectedNodeIds);
    setMapSelection(state.selectedMapIds);
  };

  const isAclRowSelectedable = (params) => {
    return params.row.groupId != null && params.row.roleId != null;
  };

  return (
    <DashboardLayout>
      {confirmDialog != null && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          handleCancel={confirmDialog.onCancelClicked}
          handleOk={confirmDialog.onConfirmClicked}
        />
      )}
      <MDBox p={0} pb={0}>
        <AclQuery
          groups={groups}
          roles={roles}
          setGroupId={setGroupId}
          setRoleId={setRoleId}
          onStateChange={onStateChange}
          onLoadAclClicked={onLoadAclClicked}
          onCreateAclClicked={onCreateAclClicked}
        />
      </MDBox>

      <MDBox p={0} pb={0}>
        <Grid container spacing={0}>
          <Grid item xs={12}>
            <Card>
              <MDBox p={3} lineHeight={0}>
                <MDTypography variant="h6" fontWeight="medium">
                  Access Control Lists (ACL)
                </MDTypography>
                <DataGrid
                  apiRef={apiRef}
                  onCellClick={onCellClick}
                  rows={aclTableRows}
                  columns={aclTableColumns}
                  onRowSelectionModelChange={onAclSelectionChanged}
                  isRowSelectable={isAclRowSelectedable}
                  disableRowSelectionOnClick
                  loading={aclTableLoading}
                  {...tableLayout}
                  rowHeight={30}
                />
                <MDBox pt={3} lineHeight={0}>
                  <Grid
                    container
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Grid item xs={12}>
                      {aclSelectionIds.length > 0 && (
                        <Tooltip title="(Un)delete Selected ACLs">
                          <MDButton
                               onClick={onDeleteAclClicked}
                          >
                            Delete
                          </MDButton>
                        </Tooltip>
                      )}
                      &nbsp;
                      <Tooltip title="Save ACL Table">
                        <MDButton
                          onClick={onSaveAclClicked}
                        >
                          Save
                        </MDButton>
                      </Tooltip>
                      &nbsp;
                      <Tooltip title="Clear ACL Table">
                        <MDButton
                          onClick={onClearAclClicked}
                        >
                          Clear
                        </MDButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
};
