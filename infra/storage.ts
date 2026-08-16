import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { availabilityZone, dataVolumeSize } from "./config";

/**
 * Postgres and Redis data live here, NOT on the instance root volume and NOT in
 * Docker named volumes.
 *
 * This is the fix for the worst failure mode in the old stack: the AMI was looked
 * up with `mostRecent: true`, so the next AL2023 release would replace the
 * instance on an unrelated `pulumi up` and take the database with it.
 *
 * A standalone ebs.Volume is not part of the instance's block device mapping, so
 * DeleteOnTermination does not apply to it. Pulumi deletes the VolumeAttachment
 * (a detach), then the instance; the volume itself survives untouched.
 *
 * `protect: true` additionally makes `pulumi destroy` refuse to delete it — you
 * have to unprotect it deliberately. Losing the DB should take more than a typo.
 */
export function createDataVolume(): aws.ebs.Volume {
  return new aws.ebs.Volume(
    "lifepulse-data",
    {
      availabilityZone,
      size: dataVolumeSize,
      type: "gp3",
      encrypted: true,
      tags: { Name: "lifepulse-data" },
    },
    { protect: true },
  );
}

export function attachDataVolume(
  volumeId: pulumi.Input<string>,
  instanceId: pulumi.Input<string>,
): aws.ec2.VolumeAttachment {
  return new aws.ec2.VolumeAttachment("lifepulse-data-attach", {
    deviceName: "/dev/sdf",
    volumeId,
    instanceId,
    // Detaching a volume that is still mounted on a *running* instance hangs and
    // eventually fails with "Error waiting for Volume to detach" — a long-running
    // upstream issue. Stopping first is the supported fix.
    //
    // Do NOT reach for forceDetach as an alternative: it yanks the device out
    // from under a mounted filesystem and corrupts the data.
    stopInstanceBeforeDetaching: true,
  });
}
