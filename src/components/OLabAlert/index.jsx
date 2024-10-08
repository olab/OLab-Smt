import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Fragment } from "react";

function OLabAlert({ onClose, children}) {

  const progressAction = (
    <Fragment>
      <IconButton
        size="small"
        aria-label="close"
        onClick={onClose}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Fragment>
  );

  return (
    <Snackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      open={children != null}
      onClose={onClose}
      message={children}
      action={progressAction}
    />
  );
}

export default OLabAlert;
