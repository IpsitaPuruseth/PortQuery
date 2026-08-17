function PortQueryTips({ handleCloseTips }) {
  return (
    <div className="tips-overlay">
      <div className="tips-box">
        <h2>Port Query Help</h2>
 
        <pre>
          {`PortQry is a command-line utility that you can use to help troubleshoot TCP/IP connectivity issues.

This utility reports the port status of target TCP and User Datagram Protocol (UDP) ports on a local computer or on a remote computer.

Port status reporting :

• LISTENING
This response indicates that a process is listening on the target port.

PortQry received a response from the target port.

• NOT LISTENING
This response indicates that no process is listening on the target port.

PortQry received one of the following Internet Control Message Protocol (ICMP) messages from the target port:

• Destination unreachable

• Port unreachable

• FILTERED
This response indicates that the target port is being filtered.

PortQry did not receive a response from the target port. A process may or may not be listening on the target port.

By default, PortQry queries a TCP port three times before it returns a response of FILTERED and queries a UDP port one time before it returns a response of FILTERED.

PortQry version 2.0

Displays the state of TCP and UDP ports.

Command line mode:
portqry -n name_to_query [-options]

Interactive mode:
portqry -i [-n name_to_query] [-options]

Local Mode:
portqry -local | -wpid pid | -wport port [-options]

Examples:

portqry -n myserver.com -e 25

portqry -n 10.0.0.1 -e 53 -p UDP

portqry -n host1.dev.reskit.com -r 21:445

portqry -n 10.0.0.1 -o 25,445,1024 -p both -sp 53

portqry -n host2 -cn !my community name! -e 161 -p udp
`}
        </pre>

        <button onClick={handleCloseTips}>Close</button>
      </div>
    </div>
  );
}

export default PortQueryTips;
